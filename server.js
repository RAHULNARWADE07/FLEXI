require('dotenv').config();
const express = require('express');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. SIMPLE WATER SYSTEM STATE (Digital Twin)
// ==========================================
let systemState = {
  tankLevel: 85,          // Tank water level in % (0 - 100)
  flowRate: 20,           // Water flow in Liters/minute (Normal is 15 - 25)
  valveStatus: 'OPEN',    // 'OPEN' or 'CLOSED'
  leakDetected: false,    // Is there a leak right now?
  waterSavedLiters: 1250, // Total water saved by the AI agent
  apiKeyConfigured: !!process.env.GEMINI_API_KEY,
  agentLog: [
    { time: new Date().toLocaleTimeString(), message: 'System online. Monitoring water line.' }
  ]
};

// Initialize Gemini Client
let geminiClient = null;
let currentApiKey = process.env.GEMINI_API_KEY || '';

function setupGemini(key) {
  if (key && key.trim()) {
    try {
      currentApiKey = key.trim();
      geminiClient = new GoogleGenAI({ apiKey: currentApiKey });
      systemState.apiKeyConfigured = true;
      console.log('Google Gemini AI initialized successfully.');
      return true;
    } catch (e) {
      console.error('Gemini Init error:', e.message);
      return false;
    }
  }
  return false;
}

setupGemini(currentApiKey);

// Background simulation: Water flows gently if valve is open
setInterval(() => {
  if (systemState.valveStatus === 'OPEN') {
    if (systemState.leakDetected) {
      systemState.flowRate = 85; // High burst flow
      systemState.tankLevel = Math.max(10, systemState.tankLevel - 1);
    } else {
      systemState.flowRate = 18 + Math.floor(Math.random() * 5); // Normal 18-23 L/min
    }
  } else {
    systemState.flowRate = 0; // Valve closed = 0 flow
  }
}, 2000);

// ==========================================
// 2. API ENDPOINTS
// ==========================================

// Get current system status
app.get('/api/status', (req, res) => {
  res.json(systemState);
});

// Trigger a Water Leak (Simulation button)
app.post('/api/leak', (req, res) => {
  systemState.leakDetected = true;
  systemState.flowRate = 85;
  systemState.valveStatus = 'OPEN';
  systemState.agentLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: '⚠️ Pipe Leak Occurred! Flow spiked to 85 L/min.'
  });
  res.json({ success: true, state: systemState });
});

// Reset back to normal
app.post('/api/reset', (req, res) => {
  systemState.leakDetected = false;
  systemState.valveStatus = 'OPEN';
  systemState.flowRate = 20;
  systemState.tankLevel = 85;
  systemState.agentLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: '🔄 System reset to normal state. Valve is OPEN.'
  });
  res.json({ success: true, state: systemState });
});

// Manual Valve Toggle (Open / Close)
app.post('/api/valve', (req, res) => {
  const { action } = req.body;
  systemState.valveStatus = action === 'CLOSE' ? 'CLOSED' : 'OPEN';
  systemState.agentLog.unshift({
    time: new Date().toLocaleTimeString(),
    message: `Manual Command: Valve set to ${systemState.valveStatus}.`
  });
  res.json({ success: true, state: systemState });
});

// Set Gemini API Key
app.post('/api/key', async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey) return res.status(400).json({ success: false, message: 'Key cannot be empty.' });

  const ok = setupGemini(apiKey);
  if (ok) {
    res.json({ success: true, message: 'Gemini API key connected!' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to initialize Gemini with this key.' });
  }
});

// ==========================================
// 3. AGENTIC AI DECISION & AUTOMATION LOOP
// ==========================================
app.post('/api/agent/run', async (req, res) => {
  // If there's no leak and valve is open, everything is normal
  if (!systemState.leakDetected && systemState.valveStatus === 'OPEN') {
    return res.json({
      success: true,
      decision: 'Normal water flow detected. No action needed.',
      actionTaken: 'MONITORING',
      reasoning: 'Sensor telemetry is within normal baseline (15 - 25 L/min).'
    });
  }

  let decisionText = '';
  let shouldCloseValve = false;

  // Use Gemini AI if key is available
  if (geminiClient) {
    try {
      const prompt = `
You are an Autonomous Smart Water Conservation Agent.
Current IoT Sensor Data:
- Flow Rate: ${systemState.flowRate} Liters/min (Normal limit: 25 L/min)
- Water Tank Level: ${systemState.tankLevel}%
- Valve Status: ${systemState.valveStatus}
- Leak Anomaly Flag: ${systemState.leakDetected ? 'YES - ABNORMAL HIGH FLOW' : 'NO'}

Task:
1. Diagnose if water is being wasted.
2. Decide whether to CLOSE the smart valve immediately.
3. Keep your response short and clear in 2-3 sentences. Mention the exact action: "ACTION: CLOSE VALVE" or "ACTION: MAINTAIN VALVE".
`;

      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      decisionText = response.text || '';
      shouldCloseValve = decisionText.toUpperCase().includes('CLOSE');
    } catch (err) {
      console.warn('Gemini request failed, using backup logic:', err.message);
      decisionText = `[AI Heuristic Backup] High leak flow (${systemState.flowRate} L/min) detected. Critical water loss in progress. ACTION: CLOSE VALVE.`;
      shouldCloseValve = true;
    }
  } else {
    // Smart Heuristic Agent (Works without API key too!)
    decisionText = `[Autonomous AI Agent] Flow rate of ${systemState.flowRate} L/min significantly exceeds safety threshold (25 L/min). Severe pipe rupture identified. ACTION: CLOSE VALVE.`;
    shouldCloseValve = true;
  }

  // AUTOMATION STEP: Execute the agent's decision
  if (shouldCloseValve) {
    systemState.valveStatus = 'CLOSED';
    systemState.leakDetected = false;
    systemState.flowRate = 0;
    systemState.waterSavedLiters += 500; // Credited water saved

    systemState.agentLog.unshift({
      time: new Date().toLocaleTimeString(),
      message: `🤖 AGENT AUTOMATION: Smart Valve CLOSED automatically! Conserved ~500 Liters of water.`
    });
  }

  res.json({
    success: true,
    decision: decisionText,
    actionTaken: shouldCloseValve ? 'VALVE_CLOSED' : 'NO_CHANGE',
    state: systemState
  });
});

// ==========================================
// 4. GEMINI CONVERSATIONAL ASSISTANT (Chatbot)
// ==========================================
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  if (geminiClient) {
    try {
      const response = await geminiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are AquaBot, a friendly and smart Water Conservation Assistant for an Agentic AI project.
The user is asking: "${message}".
Current system status:
- Tank Level: ${systemState.tankLevel}%
- Valve Status: ${systemState.valveStatus}
- Water Saved: ${systemState.waterSavedLiters} Liters.
Give a brief, helpful, and friendly reply (2-4 sentences max).`
      });

      return res.json({ reply: response.text });
    } catch (err) {
      console.warn('Chat error:', err.message);
    }
  }

  // Fallback if no Gemini key yet
  const lower = message.toLowerCase();
  let fallbackReply = `Hello! I am your Water Conservation Assistant. Currently, our smart system has saved ${systemState.waterSavedLiters} Liters of water!`;
  if (lower.includes('tip') || lower.includes('save')) {
    fallbackReply = `Here are 2 great tips to save water: 1) Fix leaking taps immediately (a dripping faucet wastes up to 20L/day). 2) Use smart flow aerators on faucets!`;
  } else if (lower.includes('valve') || lower.includes('leak')) {
    fallbackReply = `Our smart agent continuously monitors flow rate. When a leak occurs, it autonomously closes the valve to prevent water loss!`;
  }

  res.json({ reply: fallbackReply });
});

// Start the server
app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`💧 Smart Water Conservation Assistant`);
  console.log(`🤖 Agentic AI & Automation Project`);
  console.log(`🌐 Running at: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
