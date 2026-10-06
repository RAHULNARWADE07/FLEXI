// AquaAgent - Dual-Mode Frontend Controller (Works with Express API and Standalone Browser Deployment)

// 1. Digital Twin Water System State (Client-Side Memory)
let clientState = {
  tankLevel: 85,          // Tank water level in % (0 - 100)
  flowRate: 20,           // Water flow in Liters/minute (Normal is 15 - 25)
  valveStatus: 'OPEN',    // 'OPEN' or 'CLOSED'
  leakDetected: false,    // Leak anomaly active
  waterSavedLiters: 1250, // Total water saved
  apiKeyConfigured: false,
  agentLog: [
    { time: new Date().toLocaleTimeString(), message: 'System online. Monitoring water line.' }
  ]
};

let isBackendAvailable = null; // null = detecting, true = express backend active, false = client-side standalone
let localApiKey = localStorage.getItem('aquaagent_gemini_key') || '';
let simulationTimer = null;

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  // Pre-fill saved Gemini API key if available
  if (localApiKey) {
    const keyInput = document.getElementById('apiKeyInput');
    const keyBtn = document.getElementById('btnSaveKey');
    if (keyInput) keyInput.value = localApiKey;
    if (keyBtn) keyBtn.textContent = 'Connected ✅';
    clientState.apiKeyConfigured = true;
  }

  // Initial connection check
  detectEnvironmentAndInit();
});

async function detectEnvironmentAndInit() {
  try {
    const res = await fetch('/api/status', { method: 'GET', headers: { 'Accept': 'application/json' } });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      isBackendAvailable = true;
      console.log('[AquaAgent] Connected to Express Backend.');
      updateUI(data);
      setInterval(fetchBackendStatus, 2000);
      return;
    }
  } catch (err) {
    // Expected in static hosts (e.g. GitHub Pages)
  }

  // Fallback to Autonomous Browser Engine
  isBackendAvailable = false;
  console.log('[AquaAgent] Running in Autonomous Browser Mode (GitHub Pages / Static Host).');
  updateUI(clientState);
  if (!simulationTimer) {
    simulationTimer = setInterval(tickClientSimulation, 2000);
  }
}

// Background simulation ticker for standalone browser mode
function tickClientSimulation() {
  if (clientState.valveStatus === 'OPEN') {
    if (clientState.leakDetected) {
      clientState.flowRate = 85;
      clientState.tankLevel = Math.max(10, clientState.tankLevel - 1);
    } else {
      clientState.flowRate = 18 + Math.floor(Math.random() * 5);
    }
  } else {
    clientState.flowRate = 0;
  }
  updateUI(clientState);
}

// Polling for Express backend mode
async function fetchBackendStatus() {
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      updateUI(data);
    }
  } catch (err) {
    console.warn('[AquaAgent] Backend status fetch failed:', err);
  }
}

// Render System State to UI
function updateUI(state) {
  if (!state) return;

  // 1. Tank Level
  const tankFill = document.getElementById('tankFill');
  const tankLevelText = document.getElementById('tankLevelText');
  const tankDetailText = document.getElementById('tankDetailText');
  if (tankFill) tankFill.style.height = `${state.tankLevel}%`;
  if (tankLevelText) tankLevelText.textContent = `${state.tankLevel}%`;
  if (tankDetailText) tankDetailText.textContent = `${state.tankLevel}% Full`;

  // 2. Flow Rate & Badges
  const flowVal = document.getElementById('flowRateVal');
  const flowDesc = document.getElementById('flowStatusText');
  const badge = document.getElementById('systemBadge');

  if (flowVal) flowVal.textContent = state.flowRate;

  if (state.leakDetected) {
    if (flowVal) flowVal.style.color = '#ef4444';
    if (flowDesc) {
      flowDesc.textContent = '🚨 DANGER: Severe Leak / Pipe Rupture Detected!';
      flowDesc.style.color = '#ef4444';
    }
    if (badge) {
      badge.className = 'status-pill red';
      badge.textContent = 'Leak Alert';
    }
  } else if (state.valveStatus === 'CLOSED') {
    if (flowVal) flowVal.style.color = '#94a3b8';
    if (flowDesc) {
      flowDesc.textContent = '🔒 Water flow stopped. Valve is Closed.';
      flowDesc.style.color = '#94a3b8';
    }
    if (badge) {
      badge.className = 'status-pill blue';
      badge.textContent = 'Valve Closed';
    }
  } else {
    if (flowVal) flowVal.style.color = '#38bdf8';
    if (flowDesc) {
      flowDesc.textContent = 'Normal baseline flow (15 - 25 L/min)';
      flowDesc.style.color = '#94a3b8';
    }
    if (badge) {
      badge.className = 'status-pill green';
      badge.textContent = 'Normal';
    }
  }

  // 3. Valve Text
  const valveText = document.getElementById('valveDetailText');
  if (valveText) {
    valveText.textContent = state.valveStatus;
    valveText.className = state.valveStatus === 'OPEN' ? 'text-green' : 'text-red';
  }

  // 4. Water Saved
  const waterSavedText = document.getElementById('waterSavedText');
  if (waterSavedText) {
    waterSavedText.textContent = `${state.waterSavedLiters.toLocaleString()} Liters`;
  }

  // 5. Recent Logs
  const logBox = document.getElementById('logContainer');
  if (logBox && state.agentLog && state.agentLog.length > 0) {
    logBox.innerHTML = state.agentLog.slice(0, 5).map(l => `
      <div class="log-item"><small>[${l.time}]</small> ${l.message}</div>
    `).join('');
  }
}

// 1. Simulate Leak
async function simulateLeak() {
  const reasoningBox = document.getElementById('agentReasoningText');
  if (reasoningBox) {
    reasoningBox.textContent = `⚠️ SENSOR ALERT: Flow rate jumped to 85 L/min! Leak detected. Click "Run AI Agent" to let Gemini diagnose and auto-fix!`;
  }

  if (isBackendAvailable) {
    try {
      const res = await fetch('/api/leak', { method: 'POST' });
      const data = await res.json();
      updateUI(data.state);
      return;
    } catch (e) {
      console.warn('Backend call failed, falling back to client mode:', e);
    }
  }

  // Standalone mode
  clientState.leakDetected = true;
  clientState.flowRate = 85;
  clientState.valveStatus = 'OPEN';
  clientState.agentLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: '⚠️ Pipe Leak Occurred! Flow spiked to 85 L/min.'
  });
  updateUI(clientState);
}

// 2. Run AI Agent (Gemini Decision + Automated Shutoff)
async function runAiAgent() {
  const reasoningBox = document.getElementById('agentReasoningText');
  if (reasoningBox) {
    reasoningBox.textContent = "🤖 Gemini Agent is inspecting water sensor data and deciding action...";
  }

  if (isBackendAvailable) {
    try {
      const res = await fetch('/api/agent/run', { method: 'POST' });
      const data = await res.json();
      if (reasoningBox) reasoningBox.textContent = data.decision;
      if (data.state) updateUI(data.state);
      return;
    } catch (e) {
      console.warn('Backend call failed, falling back to client mode:', e);
    }
  }

  // Standalone browser execution
  if (!clientState.leakDetected && clientState.valveStatus === 'OPEN') {
    if (reasoningBox) {
      reasoningBox.textContent = "Normal water flow detected (20 L/min). Baseline telemetry within safe thresholds. No intervention needed.";
    }
    return;
  }

  let decisionText = '';
  let shouldCloseValve = false;

  // Direct call to Gemini REST API if user configured key in browser
  if (localApiKey) {
    try {
      const prompt = `You are an Autonomous Smart Water Conservation Agent.
Current IoT Sensor Data:
- Flow Rate: ${clientState.flowRate} Liters/min (Normal limit: 25 L/min)
- Water Tank Level: ${clientState.tankLevel}%
- Valve Status: ${clientState.valveStatus}
- Leak Anomaly Flag: ${clientState.leakDetected ? 'YES - ABNORMAL HIGH FLOW' : 'NO'}

Task:
1. Diagnose if water is being wasted.
2. Decide whether to CLOSE the smart valve immediately.
3. Keep your response short and clear in 2-3 sentences. Mention the exact action: "ACTION: CLOSE VALVE" or "ACTION: MAINTAIN VALVE".`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${localApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        decisionText = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        shouldCloseValve = decisionText.toUpperCase().includes('CLOSE');
      }
    } catch (err) {
      console.warn('Direct Gemini call failed:', err);
    }
  }

  if (!decisionText) {
    decisionText = `[Autonomous AI Agent] Flow rate of ${clientState.flowRate} L/min significantly exceeds safety threshold (25 L/min). Severe pipe rupture identified. ACTION: CLOSE VALVE.`;
    shouldCloseValve = true;
  }

  if (shouldCloseValve) {
    clientState.valveStatus = 'CLOSED';
    clientState.leakDetected = false;
    clientState.flowRate = 0;
    clientState.waterSavedLiters += 500;

    clientState.agentLog.unshift({
      time: new Date().toLocaleTimeString(),
      message: `🤖 AGENT AUTOMATION: Smart Valve CLOSED automatically! Conserved ~500 Liters of water.`
    });
  }

  if (reasoningBox) reasoningBox.textContent = decisionText;
  updateUI(clientState);
}

// 3. Reset System
async function resetSystem() {
  const reasoningBox = document.getElementById('agentReasoningText');
  if (reasoningBox) {
    reasoningBox.textContent = `"Normal water flow detected. All parameters within safe limits. Monitoring active."`;
  }

  if (isBackendAvailable) {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      const data = await res.json();
      updateUI(data.state);
      return;
    } catch (e) {
      console.warn('Backend call failed:', e);
    }
  }

  // Standalone mode
  clientState.leakDetected = false;
  clientState.valveStatus = 'OPEN';
  clientState.flowRate = 20;
  clientState.tankLevel = 85;
  clientState.agentLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: '🔄 System reset to normal state. Valve is OPEN.'
  });
  updateUI(clientState);
}

// 4. Manual Valve Override
async function setValve(action) {
  if (isBackendAvailable) {
    try {
      const res = await fetch('/api/valve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      updateUI(data.state);
      return;
    } catch (e) {
      console.warn('Backend call failed:', e);
    }
  }

  // Standalone mode
  clientState.valveStatus = action === 'CLOSE' ? 'CLOSED' : 'OPEN';
  clientState.agentLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: `Manual Command: Valve set to ${clientState.valveStatus}.`
  });
  updateUI(clientState);
}

// 5. Save Gemini API Key
async function saveApiKey() {
  const keyInput = document.getElementById('apiKeyInput');
  const key = keyInput ? keyInput.value.trim() : '';
  if (!key) return alert('Please paste a valid Gemini API key.');

  const btn = document.getElementById('btnSaveKey');
  if (btn) btn.textContent = 'Connecting...';

  localApiKey = key;
  localStorage.setItem('aquaagent_gemini_key', key);
  clientState.apiKeyConfigured = true;

  if (isBackendAvailable) {
    try {
      const res = await fetch('/api/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });
      const data = await res.json();
      alert(data.message || 'Gemini API key connected!');
    } catch (e) {
      alert('Key saved locally in browser.');
    }
  } else {
    alert('Gemini API key saved! AI Agent and Chatbot will now query live Google Gemini.');
  }

  if (btn) btn.textContent = 'Connected ✅';
}

// 6. Chat Assistant
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input ? input.value.trim() : '';
  if (!msg) return;

  input.value = '';
  appendChat('user', msg);

  if (isBackendAvailable) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg })
      });
      const data = await res.json();
      appendChat('bot', data.reply);
      return;
    } catch (e) {
      console.warn('Backend chat failed:', e);
    }
  }

  // Standalone Mode: Call Gemini or Smart AI Context Fallback
  if (localApiKey) {
    try {
      const prompt = `You are AquaBot, a friendly and smart Water Conservation Assistant for an Agentic AI project.
The user is asking: "${msg}".
Current system status:
- Tank Level: ${clientState.tankLevel}%
- Valve Status: ${clientState.valveStatus}
- Water Saved: ${clientState.waterSavedLiters} Liters.
Give a brief, helpful, and friendly reply (2-4 sentences max).`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${localApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const json = await response.json();
        const reply = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (reply) {
          appendChat('bot', reply);
          return;
        }
      }
    } catch (e) {
      console.warn('Direct chat error:', e);
    }
  }

  // Smart Context-Aware Fallback
  const lower = msg.toLowerCase();
  let fallbackReply = `Hello! I am AquaBot, your Water Conservation Assistant. Currently, our smart system has saved ${clientState.waterSavedLiters.toLocaleString()} Liters of water!`;
  if (lower.includes('tip') || lower.includes('save')) {
    fallbackReply = `Here are 2 great tips to save water: 1) Fix leaking taps immediately (a dripping faucet wastes up to 20L/day). 2) Use smart flow aerators on faucets!`;
  } else if (lower.includes('valve') || lower.includes('leak')) {
    fallbackReply = `Our smart agent continuously monitors flow rate. When a leak occurs, it autonomously closes the valve to prevent water loss!`;
  } else if (lower.includes('agent') || lower.includes('ai') || lower.includes('work')) {
    fallbackReply = `Our Agentic AI works in 3 autonomous steps: 1) Sensor Monitor Agent tracks telemetry, 2) Gemini Decision Agent detects anomalies & plans action, and 3) Automation Agent closes the physical valve!`;
  }

  appendChat('bot', fallbackReply);
}

function askQuick(text) {
  const input = document.getElementById('chatInput');
  if (input) {
    input.value = text;
    sendChatMessage();
  }
}

function appendChat(role, text) {
  const box = document.getElementById('chatHistory');
  if (!box) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<strong>${role === 'user' ? 'You' : 'AquaBot'}:</strong> ${escapeHtml(text)}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
}
