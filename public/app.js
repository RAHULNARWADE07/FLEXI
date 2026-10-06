// Simplified Frontend Logic for Smart Water Conservation Assistant

async function fetchStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    updateUI(data);
  } catch (err) {
    console.error('Error fetching status:', err);
  }
}

function updateUI(state) {
  // 1. Tank Level
  document.getElementById('tankFill').style.height = `${state.tankLevel}%`;
  document.getElementById('tankLevelText').textContent = `${state.tankLevel}%`;
  document.getElementById('tankDetailText').textContent = `${state.tankLevel}% Full`;

  // 2. Flow Rate
  const flowVal = document.getElementById('flowRateVal');
  flowVal.textContent = state.flowRate;

  const flowDesc = document.getElementById('flowStatusText');
  const badge = document.getElementById('systemBadge');

  if (state.leakDetected) {
    flowVal.style.color = '#ef4444';
    flowDesc.textContent = '🚨 DANGER: Severe Leak / Pipe Rupture Detected!';
    flowDesc.style.color = '#ef4444';
    badge.className = 'status-pill red';
    badge.textContent = 'Leak Alert';
  } else if (state.valveStatus === 'CLOSED') {
    flowVal.style.color = '#94a3b8';
    flowDesc.textContent = '🔒 Water flow stopped. Valve is Closed.';
    flowDesc.style.color = '#94a3b8';
    badge.className = 'status-pill blue';
    badge.textContent = 'Valve Closed';
  } else {
    flowVal.style.color = '#38bdf8';
    flowDesc.textContent = 'Normal baseline flow (15 - 25 L/min)';
    flowDesc.style.color = '#94a3b8';
    badge.className = 'status-pill green';
    badge.textContent = 'Normal';
  }

  // 3. Valve Text
  const valveText = document.getElementById('valveDetailText');
  valveText.textContent = state.valveStatus;
  valveText.className = state.valveStatus === 'OPEN' ? 'text-green' : 'text-red';

  // 4. Water Saved
  document.getElementById('waterSavedText').textContent = `${state.waterSavedLiters.toLocaleString()} Liters`;

  // 5. Recent Logs
  const logBox = document.getElementById('logContainer');
  if (state.agentLog && state.agentLog.length > 0) {
    logBox.innerHTML = state.agentLog.slice(0, 5).map(l => `
      <div class="log-item"><small>[${l.time}]</small> ${l.message}</div>
    `).join('');
  }
}

// 1. Simulate Leak
async function simulateLeak() {
  const res = await fetch('/api/leak', { method: 'POST' });
  const data = await res.json();
  updateUI(data.state);
  document.getElementById('agentReasoningText').textContent = 
    `⚠️ SENSOR ALERT: Flow rate jumped to 85 L/min! Leak detected. Click "Run AI Agent" to let Gemini diagnose and auto-fix!`;
}

// 2. Run AI Agent (Gemini Decision + Automated Shutoff)
async function runAiAgent() {
  const reasoningBox = document.getElementById('agentReasoningText');
  reasoningBox.textContent = "🤖 Gemini Agent is inspecting water sensor data and deciding action...";

  const res = await fetch('/api/agent/run', { method: 'POST' });
  const data = await res.json();

  reasoningBox.textContent = data.decision;
  if (data.state) {
    updateUI(data.state);
  }
}

// 3. Reset System
async function resetSystem() {
  const res = await fetch('/api/reset', { method: 'POST' });
  const data = await res.json();
  updateUI(data.state);
  document.getElementById('agentReasoningText').textContent = 
    `"Normal water flow detected. All parameters within safe limits. Monitoring active."`;
}

// 4. Manual Valve Override
async function setValve(action) {
  const res = await fetch('/api/valve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  const data = await res.json();
  updateUI(data.state);
}

// 5. Save Gemini API Key
async function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) return alert('Please paste a valid Gemini API key.');

  const btn = document.getElementById('btnSaveKey');
  btn.textContent = 'Connecting...';

  const res = await fetch('/api/key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: key })
  });
  const data = await res.json();
  alert(data.message);
  btn.textContent = 'Connected ✅';
}

// 6. Chat Assistant
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendChat('user', msg);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: msg })
  });
  const data = await res.json();
  appendChat('bot', data.reply);
}

function askQuick(text) {
  document.getElementById('chatInput').value = text;
  sendChatMessage();
}

function appendChat(role, text) {
  const box = document.getElementById('chatHistory');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<strong>${role === 'user' ? 'You' : 'AquaBot'}:</strong> ${text}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// Start polling
setInterval(fetchStatus, 2000);
fetchStatus();
