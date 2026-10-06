/**
 * AquaAgent - Main Frontend Application Controller
 * Handles SSE streams, Agent Swarm UI updates, Scenario Triggers, and Copilot Chat.
 */

// Global State
let currentSystemState = null;
let eventSource = null;
let chatHistory = [];

// Audio Synthesizer (Web Audio API)
const AudioFX = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  },
  playBeep(freq = 440, type = 'sine', duration = 0.15) {
    try {
      this.init();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  },
  playAlert() {
    this.playBeep(880, 'triangle', 0.25);
    setTimeout(() => this.playBeep(660, 'triangle', 0.3), 150);
  },
  playSuccess() {
    this.playBeep(523.25, 'sine', 0.15); // C5
    setTimeout(() => this.playBeep(659.25, 'sine', 0.2), 120); // E5
  },
  playClick() {
    this.playBeep(320, 'sine', 0.06);
  }
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  console.log('[AquaAgent] Frontend initialized.');
  window.initTelemetryChart();
  initEventStream();

  // Check saved Gemini API key in localStorage
  const savedKey = localStorage.getItem('aquaagent_gemini_key');
  if (savedKey) {
    document.getElementById('geminiApiKeyInput').value = savedKey;
  }
});

/**
 * Connect to Real-Time Server-Sent Events (SSE)
 */
function initEventStream() {
  if (eventSource) eventSource.close();

  eventSource = new EventSource('/api/events');

  eventSource.addEventListener('state_update', (event) => {
    try {
      const data = JSON.parse(event.data);
      currentSystemState = data;
      renderSystemState(data);
    } catch (err) {
      console.error('[SSE] Parse error:', err);
    }
  });

  eventSource.onerror = (err) => {
    console.warn('[SSE] Reconnecting to stream...', err);
  };
}

/**
 * Render Complete System State on every tick
 */
function renderSystemState(state) {
  // 1. KPI Stats
  document.getElementById('kpiWaterSaved').textContent = Number(state.metrics.totalWaterSavedTodayLiters).toLocaleString();
  document.getElementById('kpiCostSaved').textContent = `$${state.metrics.totalCostSavedTodayUsd}`;
  document.getElementById('kpiCarbonOffset').textContent = state.metrics.carbonEmissionReducedKg;
  document.getElementById('kpiAutonomousActions').textContent = state.metrics.autonomousActionsExecutedCount;
  document.getElementById('kpiEfficiency').textContent = `${state.metrics.conservationEfficiencyPct}% Swarm Efficiency`;

  // 2. Operational Mode Buttons
  document.querySelectorAll('.mode-pill').forEach(btn => btn.classList.remove('active'));
  if (state.systemMode === 'AUTONOMOUS') document.getElementById('btnModeAuto').classList.add('active');
  if (state.systemMode === 'SEMI_AUTONOMOUS') document.getElementById('btnModeSemi').classList.add('active');
  if (state.systemMode === 'MANUAL_OVERRIDE') document.getElementById('btnModeManual').classList.add('active');

  // 3. Gemini Status Badge
  const geminiText = document.getElementById('geminiStatusText');
  if (state.geminiConfigured) {
    geminiText.textContent = 'Gemini 2.5 Flash Online';
    geminiText.style.color = '#00f5d4';
  } else {
    geminiText.textContent = 'Local Heuristics Active';
    geminiText.style.color = '#94a3b8';
  }

  // 4. Reservoir Visuals
  const tank = state.reservoir;
  const tankBar = document.getElementById('tankFillBar');
  tankBar.style.height = `${tank.levelPercentage}%`;
  document.getElementById('tankCurrentLiters').textContent = Number(tank.currentLiters).toLocaleString();
  document.getElementById('tankPctBadge').textContent = `${tank.levelPercentage}%`;
  document.getElementById('tankInflow').textContent = `${tank.inflowRateLpm} L/m`;
  document.getElementById('tankOutflow').textContent = `${tank.outflowRateLpm} L/m`;
  document.getElementById('tankWaterQuality').textContent = `${tank.waterQuality.status} (pH ${tank.waterQuality.ph})`;

  const btnPump = document.getElementById('btnPumpToggle');
  if (tank.pumpActive) {
    btnPump.textContent = 'Pump: ONLINE';
    btnPump.className = 'btn-micro-toggle active';
  } else {
    btnPump.textContent = 'Pump: STANDBY';
    btnPump.className = 'btn-micro-toggle';
  }

  // 5. Environmental & Weather
  const w = state.weather;
  document.getElementById('weatherBadge').textContent = `🌤️ ${w.condition} • ${w.temperatureC}°C • Rain: ${w.rainProbabilityPct}%`;

  // 6. Zone 1: Sector 4 Residential
  const z1 = state.zones.zone1_residential;
  const cardRes = document.getElementById('zoneCardRes');
  document.getElementById('zone1Flow').textContent = z1.currentFlowLpm;
  document.getElementById('zone1Pressure').textContent = z1.pressurePsi;
  document.getElementById('zone1ValvePctText').textContent = `${z1.valveThrottlePct}% (${z1.valveStatus})`;

  const badgeZ1 = document.getElementById('zone1StatusBadge');
  if (z1.anomalySeverity === 'CRITICAL') {
    cardRes.className = 'zone-interactive-card alert-burst';
    badgeZ1.className = 'zone-status-badge red';
    badgeZ1.textContent = 'PIPE BURST';
  } else if (z1.anomalySeverity === 'MEDIUM') {
    cardRes.className = 'zone-interactive-card alert-leak';
    badgeZ1.className = 'zone-status-badge amber';
    badgeZ1.textContent = 'SLOW LEAK';
  } else {
    cardRes.className = 'zone-interactive-card';
    badgeZ1.className = 'zone-status-badge green';
    badgeZ1.textContent = z1.valveStatus === 'CLOSED' ? 'ISOLATED' : 'NORMAL';
  }

  // 7. Zone 2: Commercial
  const z2 = state.zones.zone2_commercial;
  document.getElementById('zone2Flow').textContent = z2.currentFlowLpm;
  document.getElementById('zone2Pressure').textContent = z2.pressurePsi;
  document.getElementById('zone2Recycled').textContent = z2.greywaterRecycledPct;
  document.getElementById('zone2ValvePctText').textContent = `${z2.valveThrottlePct}% (${z2.valveStatus})`;

  // 8. Zone 3: Botanical Irrigation
  const z3 = state.zones.zone3_irrigation;
  document.getElementById('zone3Soil').textContent = z3.soilMoisturePct;
  document.getElementById('zone3Flow').textContent = z3.currentFlowLpm;
  document.getElementById('zone3ValvePctText').textContent = `${z3.valveThrottlePct}% (${z3.valveStatus})`;

  const z3Badge = document.getElementById('zone3StatusBadge');
  const z3Interlock = document.getElementById('zone3RainInterlock');
  if (z3.irrigationStatus === 'IRRIGATING') {
    z3Badge.className = 'zone-status-badge green';
    z3Badge.textContent = 'IRRIGATING';
    z3Interlock.textContent = 'Active (40%)';
  } else if (z3.irrigationStatus === 'CANCELLED_RAIN_ANTICIPATED') {
    z3Badge.className = 'zone-status-badge blue';
    z3Badge.textContent = 'RAIN HOLD (650L SAVED)';
    z3Interlock.textContent = 'Rain Interlock Engaged';
  } else {
    z3Badge.className = 'zone-status-badge blue';
    z3Badge.textContent = 'ECO IDLE';
    z3Interlock.textContent = 'Standby';
  }

  // 9. Multi-Agent Swarm Visualizer
  updateAgentCard('Supervisor', state.agents.supervisorAgent);
  updateAgentCard('Diagnostic', state.agents.leakDiagnosticAgent);
  updateAgentCard('Irrigation', state.agents.irrigationOptimizerAgent);
  updateAgentCard('Actuator', state.agents.actuatorAgent);
  updateAgentCard('Incident', state.agents.incidentAutomationAgent);
  updateAgentCard('Telemetry', state.agents.telemetryAgent);

  // 10. Update Telemetry Chart
  if (state.telemetryHistory && window.updateTelemetryChart) {
    window.updateTelemetryChart(state.telemetryHistory);
  }

  // 11. Render Real-time Logs
  renderLogs(state.logs);

  // 12. Render Work Orders
  renderTickets(state.tickets);
}

function updateAgentCard(agentPrefix, agentData) {
  if (!agentData) return;
  const statusEl = document.getElementById(`status${agentPrefix}`);
  const thoughtEl = document.getElementById(`thought${agentPrefix}`);
  const actionEl = document.getElementById(`action${agentPrefix}`);

  if (statusEl) {
    statusEl.textContent = agentData.status;
    statusEl.className = `agent-state-pill ${agentData.status.toLowerCase()}`;
  }
  if (thoughtEl) thoughtEl.textContent = agentData.lastThought || 'Standby...';
  if (actionEl) actionEl.textContent = agentData.lastAction || 'No recent action';
}

function renderLogs(logs) {
  const container = document.getElementById('agentLogContainer');
  if (!container || !Array.isArray(logs)) return;

  container.innerHTML = logs.map(l => `
    <div class="log-entry">
      <span class="log-time">[${l.timestamp}]</span>
      <span class="log-agent">${l.agent}:</span>
      <span class="log-badge ${l.badge}">${l.badge}</span>
      <span class="log-msg">${escapeHtml(l.message)}</span>
    </div>
  `).join('');
}

function renderTickets(tickets) {
  const container = document.getElementById('ticketsContainer');
  const countBadge = document.getElementById('ticketCountBadge');
  if (!container || !Array.isArray(tickets)) return;

  countBadge.textContent = `${tickets.length} Active`;

  container.innerHTML = tickets.map(t => `
    <div class="ticket-card">
      <div class="ticket-header">
        <span class="ticket-id">${t.id} &bull; ${t.zone}</span>
        <span class="ticket-badge ${t.severity}">${t.severity}</span>
      </div>
      <p class="ticket-desc">${escapeHtml(t.description)}</p>
      <div class="ticket-footer">
        <span>Status: <strong>${t.status}</strong></span>
        <span class="saved-liters">💧 ~${t.estimatedWaterSavedLiters || 0} L Saved</span>
      </div>
    </div>
  `).join('');
}

// ================= USER & AGENT ACTIONS =================

/**
 * Trigger Real-World Simulation Scenarios
 */
async function triggerScenario(scenario) {
  AudioFX.playAlert();
  try {
    const res = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    const result = await res.json();
    console.log('[Scenario Triggered]:', result);
  } catch (err) {
    console.error('Failed to trigger scenario:', err);
  }
}

/**
 * Manual / Operator Valve Command
 */
async function setValveCommand(zoneKey, action, throttlePct = 100) {
  AudioFX.playClick();
  try {
    const res = await fetch('/api/valve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zoneKey, action, throttlePct })
    });
    const result = await res.json();
    console.log('[Valve Actuation]:', result);
  } catch (err) {
    console.error('Failed to command valve:', err);
  }
}

/**
 * Toggle Primary Pump
 */
async function togglePump() {
  AudioFX.playClick();
  if (!currentSystemState) return;
  const targetState = !currentSystemState.reservoir.pumpActive;
  try {
    await fetch('/api/pump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: targetState })
    });
  } catch (err) {
    console.error('Failed to toggle pump:', err);
  }
}

/**
 * Set Operational Mode
 */
async function setSystemMode(mode) {
  AudioFX.playClick();
  try {
    await fetch('/api/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
  } catch (err) {
    console.error('Failed to set mode:', err);
  }
}

function clearLogsUI() {
  const container = document.getElementById('agentLogContainer');
  if (container) container.innerHTML = '<div class="log-entry"><span class="log-msg text-muted">Log display cleared.</span></div>';
}

// ================= COPILOT DRAWER & CHAT =================

function toggleCopilotDrawer() {
  AudioFX.playClick();
  const drawer = document.getElementById('copilotDrawer');
  drawer.classList.toggle('open');
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendCopilotMessage();
  }
}

function askQuickPrompt(text) {
  const input = document.getElementById('copilotInput');
  input.value = text;
  sendCopilotMessage();
}

async function sendCopilotMessage() {
  const input = document.getElementById('copilotInput');
  const query = input.value.trim();
  if (!query) return;

  AudioFX.playClick();
  input.value = '';

  // Append user bubble
  appendMessage('user', query);
  chatHistory.push({ role: 'user', text: query });

  // Append placeholder loading bubble
  const loadingId = 'loading-' + Date.now();
  appendLoadingBubble(loadingId);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: query, history: chatHistory })
    });

    const data = await res.json();
    removeLoadingBubble(loadingId);

    const replyText = data.reply || 'No response received from agent.';
    appendMessage('assistant', replyText, data.isGeminiGenerated);
    chatHistory.push({ role: 'model', text: replyText });

    AudioFX.playSuccess();
  } catch (err) {
    removeLoadingBubble(loadingId);
    appendMessage('assistant', `⚠️ **Error communicating with Copilot:** ${err.message}`);
  }
}

function appendMessage(role, text, isGemini = false) {
  const container = document.getElementById('copilotMessages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `copilot-msg ${role}`;

  const geminiBadge = isGemini ? '<div style="font-size: 0.65rem; color: #00f5d4; margin-bottom: 4px; font-weight: 700;">✨ Gemini 2.5 Flash</div>' : '';

  msgDiv.innerHTML = `
    <div class="msg-bubble">
      ${geminiBadge}
      <div>${formatMarkdown(text)}</div>
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function appendLoadingBubble(id) {
  const container = document.getElementById('copilotMessages');
  const msgDiv = document.createElement('div');
  msgDiv.id = id;
  msgDiv.className = 'copilot-msg assistant';
  msgDiv.innerHTML = `
    <div class="msg-bubble" style="opacity: 0.7;">
      <em>Agent Swarm synthesizing telemetry with Gemini...</em>
    </div>
  `;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function removeLoadingBubble(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Simple Markdown Formatter
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>');
}

// ================= MODALS =================

function openApiKeyModal() {
  AudioFX.playClick();
  document.getElementById('apiKeyModal').classList.remove('hidden');
}

function closeApiKeyModal() {
  document.getElementById('apiKeyModal').classList.add('hidden');
}

async function saveGeminiApiKey() {
  const keyInput = document.getElementById('geminiApiKeyInput');
  const resultBox = document.getElementById('apiKeyTestResult');
  const btn = document.getElementById('btnSaveApiKey');
  const key = keyInput.value.trim();

  if (!key) {
    resultBox.className = 'test-result-box error';
    resultBox.textContent = 'Please enter a valid Gemini API key.';
    resultBox.classList.remove('hidden');
    return;
  }

  btn.textContent = 'Verifying with Google...';
  btn.disabled = true;

  try {
    const res = await fetch('/api/config/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key })
    });
    const result = await res.json();

    if (result.success) {
      localStorage.setItem('aquaagent_gemini_key', key);
      resultBox.className = 'test-result-box success';
      resultBox.innerHTML = `<strong>Connected!</strong> ${result.message}`;
      resultBox.classList.remove('hidden');
      AudioFX.playSuccess();
      setTimeout(() => closeApiKeyModal(), 1200);
    } else {
      resultBox.className = 'test-result-box error';
      resultBox.textContent = `Verification Failed: ${result.message}`;
      resultBox.classList.remove('hidden');
    }
  } catch (err) {
    resultBox.className = 'test-result-box error';
    resultBox.textContent = `Network Error: ${err.message}`;
    resultBox.classList.remove('hidden');
  } finally {
    btn.textContent = 'Test & Save Key';
    btn.disabled = false;
  }
}

// ================= AUDIT REPORT MODAL =================

async function openAuditReportModal() {
  AudioFX.playClick();
  const modal = document.getElementById('auditReportModal');
  const content = document.getElementById('auditReportContent');
  modal.classList.remove('hidden');

  content.innerHTML = '<p>Generating Certified Water Conservation Audit...</p>';

  try {
    const res = await fetch('/api/report');
    const r = await res.json();

    content.innerHTML = `
      <div style="border-bottom: 2px solid #00f5d4; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="color: #00f5d4; font-size: 1.25rem;">WATER CONSERVATION & COMPLIANCE CERTIFICATE</h2>
        <p style="font-size: 0.8rem; color: #94a3b8;"><strong>Report ID:</strong> ${r.reportId} | <strong>Authority:</strong> ${r.organization}</p>
        <p style="font-size: 0.8rem; color: #94a3b8;"><strong>Audited by:</strong> ${r.auditorAgent}</p>
        <p style="font-size: 0.8rem; color: #94a3b8;"><strong>Timestamp:</strong> ${new Date(r.generatedAt).toLocaleString()}</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px;">
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          <span style="font-size: 0.75rem; color: #64748b;">TOTAL WATER CONSERVED TODAY</span>
          <h3 style="color: #00f5d4; font-size: 1.5rem; font-family: monospace;">${r.metrics.waterSavedTodayLiters} Liters</h3>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          <span style="font-size: 0.75rem; color: #64748b;">FINANCIAL TARIFF SAVINGS</span>
          <h3 style="color: #10b981; font-size: 1.5rem; font-family: monospace;">${r.metrics.costSavingsUsd}</h3>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          <span style="font-size: 0.75rem; color: #64748b;">CONSERVATION EFFICIENCY INDEX</span>
          <h3 style="color: #c084fc; font-size: 1.5rem; font-family: monospace;">${r.metrics.efficiencyIndex}</h3>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          <span style="font-size: 0.75rem; color: #64748b;">PUMPING EMISSIONS OFFSET</span>
          <h3 style="color: #f59e0b; font-size: 1.5rem; font-family: monospace;">${r.metrics.carbonAvoidedKg}</h3>
        </div>
      </div>

      <h4 style="margin-bottom: 8px; color: #f8fafc;">Autonomous Interventions & Resolved Incidents (${r.incidentLog.length})</h4>
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
        ${r.incidentLog.map(t => `
          <div style="border-left: 2px solid #00f5d4; padding-left: 10px; background: rgba(0,0,0,0.2); padding: 6px 10px;">
            <strong>${t.id} &bull; ${t.zone}</strong>: ${escapeHtml(t.description)}
            <div style="color: #10b981; font-size: 0.72rem;">Resolved by: ${t.resolvedBy} (Saved ~${t.estimatedWaterSavedLiters} L)</div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 20px; padding: 12px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px;">
        <strong style="color: #10b981;">COMPLIANCE AUDIT STATUS:</strong>
        <p style="font-size: 0.8rem; color: #cbd5e1; margin-top: 4px;">${r.complianceStatus}</p>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<p style="color: #ef4444;">Error generating report: ${err.message}</p>`;
  }
}

function closeAuditReportModal() {
  document.getElementById('auditReportModal').classList.add('hidden');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
