const { GoogleGenAI } = require('@google/genai');
const config = require('./config');

class GeminiService {
  constructor() {
    this.apiKey = config.GEMINI_API_KEY || '';
    this.modelName = config.GEMINI_MODEL || 'gemini-2.5-flash';
    this.ai = null;
    this.isLive = false;

    if (this.apiKey) {
      this.initClient(this.apiKey);
    }
  }

  initClient(apiKey) {
    try {
      this.apiKey = apiKey.trim();
      this.ai = new GoogleGenAI({ apiKey: this.apiKey });
      this.isLive = true;
      console.log(`[GeminiService] Initialized with key (length: ${this.apiKey.length}). Model: ${this.modelName}`);
      return true;
    } catch (err) {
      console.error('[GeminiService] Initialization error:', err.message);
      this.isLive = false;
      return false;
    }
  }

  async testConnection(apiKey) {
    try {
      const testKey = (apiKey || this.apiKey || '').trim();
      if (!testKey) {
        return { success: false, message: 'No API key provided' };
      }
      const testAi = new GoogleGenAI({ apiKey: testKey });
      const response = await testAi.models.generateContent({
        model: this.modelName,
        contents: 'Ping: Smart Water Conservation Assistant. Respond in one sentence with "AquaAgent Gemini Online".'
      });

      const reply = response.text || 'Connected';
      this.initClient(testKey);
      return { success: true, message: reply.trim() };
    } catch (err) {
      console.error('[GeminiService] Connection test failed:', err.message);
      return { success: false, message: err.message };
    }
  }

  /**
   * Supervisor Multi-Agent Deliberation using Gemini
   * Synthesizes findings from Telemetry, Leak Diagnostics, and Irrigation agents.
   */
  async deliberateIncident(incidentContext) {
    if (!this.isLive) {
      return this._fallbackSupervisorReasoning(incidentContext);
    }

    const prompt = `
You are the "ConservationSupervisorAgent", the central cognitive orchestrator for "AquaAgent", an Autonomous Smart Water Conservation System.
You oversee the TelemetrySensorAgent, LeakDiagnosticAgent, EcoIrrigationAgent, and AutomatedActuatorAgent.

Current Anomaly Context:
- Zone: ${incidentContext.zoneName} (${incidentContext.zoneId})
- Anomaly Classification: ${incidentContext.anomalyType}
- Severity: ${incidentContext.severity}
- Flow Rate: ${incidentContext.currentFlowLpm} L/min (Baseline: ${incidentContext.baselineFlowLpm} L/min)
- Water Pressure: ${incidentContext.pressurePsi} PSI
- Soil Moisture: ${incidentContext.soilMoisturePct || 'N/A'}%
- Weather & Rain Probability: ${incidentContext.weatherSummary} (Rain: ${incidentContext.rainProbabilityPct}%)
- Current Valve Status: ${incidentContext.valveStatus}

Your Objective:
1. Perform root-cause analysis (e.g. pipe shear, nocturnal seal degradation, irrigation redundancy during rain, excessive main supply pressure).
2. Formulate immediate autonomous actuation directives (e.g. throttle valve to X%, shut off pump, cancel scheduled irrigation, reroute greywater).
3. Compute estimated water loss rate and financial/ecological risk.
4. Issue a formal dispatch order for field automation / maintenance.

Return ONLY a valid JSON object matching this schema:
{
  "agentThinking": "Your concise step-by-step reasoning",
  "rootCauseAnalysis": "Short technical description of the anomaly",
  "recommendedAction": "Exact physical actuator command (e.g. THROTTLE_VALVE_50, SHUTOFF_VALVE, CANCEL_IRRIGATION)",
  "valveTargetPercentage": 0,
  "estimatedLitersPerMinuteLoss": 45.0,
  "incidentSeverity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "citizenAlertMessage": "Message to broadcast to affected consumers or facility staff",
  "workOrderParts": ["Part 1", "Part 2"]
}
`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsed = JSON.parse(response.text);
      return {
        isGeminiGenerated: true,
        ...parsed
      };
    } catch (err) {
      console.warn('[GeminiService] Deliberation error, using fallback:', err.message);
      return this._fallbackSupervisorReasoning(incidentContext);
    }
  }

  /**
   * Conversational Copilot for User / Facility Manager
   */
  async askCopilot(userQuery, systemSnapshot, conversationHistory = []) {
    if (!this.isLive) {
      return this._fallbackCopilotResponse(userQuery, systemSnapshot);
    }

    const systemInstruction = `
You are AquaAgent Copilot, an elite AI Water Conservation & Automation Assistant.
You possess real-time visibility into the smart water distribution grid, sensors, reservoir levels, weather telemetry, and autonomous multi-agent swarm.
Always be concise, professional, data-driven, and focused on maximizing water conservation, leak mitigation, and sustainable resource stewardship.

Current System Snapshot:
- System Mode: ${systemSnapshot.systemMode}
- Reservoir Capacity: ${systemSnapshot.reservoir.currentLiters}/${systemSnapshot.reservoir.capacityLiters} L (${systemSnapshot.reservoir.levelPercentage}%)
- Water Conserved Today: ${systemSnapshot.metrics.totalWaterSavedTodayLiters} Liters ($${systemSnapshot.metrics.totalCostSavedTodayUsd} saved)
- Residential Flow: ${systemSnapshot.zones.zone1_residential.currentFlowLpm} L/min (Pressure: ${systemSnapshot.zones.zone1_residential.pressurePsi} PSI, Valve: ${systemSnapshot.zones.zone1_residential.valveStatus})
- Commercial Flow: ${systemSnapshot.zones.zone2_commercial.currentFlowLpm} L/min (Recycled Greywater: ${systemSnapshot.zones.zone2_commercial.greywaterRecycledPct}%)
- Irrigation Zone: Soil Moisture ${systemSnapshot.zones.zone3_irrigation.soilMoisturePct}% (Valve: ${systemSnapshot.zones.zone3_irrigation.valveStatus})
- Weather: ${systemSnapshot.weather.temperatureC}°C, ${systemSnapshot.weather.condition}, Rain Prob: ${systemSnapshot.weather.rainProbabilityPct}%
- Active Scenarios: ${systemSnapshot.activeScenarios.join(', ') || 'Normal Operation'}

Provide markdown formatted responses. When relevant, highlight autonomous agent actions, quantitative water savings, or recommended manual overrides.
`;

    try {
      const chatContents = [];
      chatContents.push({ role: 'user', parts: [{ text: systemInstruction }] });
      chatContents.push({ role: 'model', parts: [{ text: "Understood. I am AquaAgent Copilot, ready to assist with real-time water grid conservation and multi-agent automation." }] });

      // Add recent history if provided
      if (Array.isArray(conversationHistory)) {
        for (const msg of conversationHistory.slice(-4)) {
          chatContents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
          });
        }
      }

      chatContents.push({ role: 'user', parts: [{ text: userQuery }] });

      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: chatContents
      });

      return {
        reply: response.text,
        isGeminiGenerated: true,
        modelUsed: this.modelName
      };
    } catch (err) {
      console.warn('[GeminiService] Copilot error, using fallback:', err.message);
      return this._fallbackCopilotResponse(userQuery, systemSnapshot);
    }
  }

  /**
   * Deterministic Fallback Reasoning for when no Gemini key is active
   */
  _fallbackSupervisorReasoning(ctx) {
    if (ctx.anomalyType === 'PIPE_BURST') {
      return {
        isGeminiGenerated: false,
        agentThinking: `[Local Heuristic Engine] Critical surge detected: Flow ${ctx.currentFlowLpm} L/min exceeded burst threshold (75 L/min). Rapid pressure collapse to ${ctx.pressurePsi} PSI confirms structural rupture in ${ctx.zoneName}. Autonomous isolation required to prevent massive aquifer loss.`,
        rootCauseAnalysis: `Catastrophic pipeline breach or high-pressure coupling shear in ${ctx.zoneName}.`,
        recommendedAction: 'SHUTOFF_VALVE',
        valveTargetPercentage: 0,
        estimatedLitersPerMinuteLoss: Number((ctx.currentFlowLpm - ctx.baselineFlowLpm).toFixed(1)),
        incidentSeverity: 'CRITICAL',
        citizenAlertMessage: `EMERGENCY ALERT: Water supply temporarily halted in ${ctx.zoneName} due to automated burst isolation. Maintenance dispatched.`,
        workOrderParts: ['8-inch Ductile Iron Pipe Sleeve', 'Pressure Relief Coupling', 'Acoustic Leak Sensor']
      };
    }

    if (ctx.anomalyType === 'SLOW_NOCTURNAL_LEAK') {
      return {
        isGeminiGenerated: false,
        agentThinking: `[Local Heuristic Engine] Minimum Night Flow (MNF) analysis indicates persistent 6.8 L/min draw during non-occupancy hours. Pressure steady at ${ctx.pressurePsi} PSI. Pattern characteristic of residential flapper leak or secondary distribution seam drip.`,
        rootCauseAnalysis: 'Continuous nocturnal micro-leakage in secondary distribution manifold.',
        recommendedAction: 'THROTTLE_VALVE_50',
        valveTargetPercentage: 50,
        estimatedLitersPerMinuteLoss: 5.5,
        incidentSeverity: 'MEDIUM',
        citizenAlertMessage: `Conservation Notice: Abnormal baseline night flow detected in ${ctx.zoneName}. Pressure throttled by 50% to mitigate losses until daylight inspection.`,
        workOrderParts: ['Micro-Flow Meter Calibrator', '2-inch Ball Valve Seal Kit']
      };
    }

    if (ctx.anomalyType === 'RAIN_IRRIGATION_CONFLICT') {
      return {
        isGeminiGenerated: false,
        agentThinking: `[Local Heuristic Engine] Weather prediction shows ${ctx.rainProbabilityPct}% rain probability with current soil moisture at ${ctx.soilMoisturePct}%. Scheduled 650L irrigation would result in waterlogging and unnecessary consumption.`,
        rootCauseAnalysis: 'Scheduled irrigation redundancy during impending precipitation event.',
        recommendedAction: 'CANCEL_IRRIGATION',
        valveTargetPercentage: 0,
        estimatedLitersPerMinuteLoss: 0,
        incidentSeverity: 'LOW',
        citizenAlertMessage: `Eco-Optimization: Irrigation in Botanical Park auto-suspended. Anticipated rainfall will replenish root zone naturally. Saved 650 Liters.`,
        workOrderParts: ['None (Virtual Optimization)']
      };
    }

    // Default normal deliberation
    return {
      isGeminiGenerated: false,
      agentThinking: `[Local Heuristic Engine] Telemetry within operational bounds across ${ctx.zoneName}. Current flow ${ctx.currentFlowLpm} L/min vs baseline ${ctx.baselineFlowLpm} L/min.`,
      rootCauseAnalysis: 'Normal diurnal consumption profile.',
      recommendedAction: 'MAINTAIN_CURRENT_STATE',
      valveTargetPercentage: 100,
      estimatedLitersPerMinuteLoss: 0,
      incidentSeverity: 'LOW',
      citizenAlertMessage: 'Grid status nominal. All conservation agents active.',
      workOrderParts: []
    };
  }

  _fallbackCopilotResponse(query, state) {
    const q = query.toLowerCase();

    if (q.includes('save') || q.includes('conservation') || q.includes('saved')) {
      return {
        reply: `### 💧 AquaAgent Conservation Summary
Today, the autonomous multi-agent system has conserved **${state.metrics.totalWaterSavedTodayLiters} Liters** of water across the network.
- **Financial Savings:** $${state.metrics.totalCostSavedTodayUsd} (approx.)
- **Carbon Offset:** ${state.metrics.carbonEmissionReducedKg} kg CO₂ from reduced pump energy
- **Efficiency Index:** ${state.metrics.conservationEfficiencyPct}%
- **Key Interventions:** Weather-predictive irrigation holds, nocturnal pressure regulation, and micro-leak isolation.`,
        isGeminiGenerated: false,
        modelUsed: 'Local Smart Assistant'
      };
    }

    if (q.includes('burst') || q.includes('leak') || q.includes('anomaly')) {
      return {
        reply: `### 🔍 Leak & Anomaly Diagnostics
- **Sector 4 Residential:** Flow is ${state.zones.zone1_residential.currentFlowLpm} L/min (Pressure: ${state.zones.zone1_residential.pressurePsi} PSI). Valve: **${state.zones.zone1_residential.valveStatus}** (${state.zones.zone1_residential.valveThrottlePct}%).
- **Leak Diagnostic Agent Status:** ${state.agents.leakDiagnosticAgent.status}
- **Last Finding:** *"${state.agents.leakDiagnosticAgent.lastThought}"*
- **Recent Actions:** Automated actuation agent is configured for instantaneous shutoff (< 1.5s) upon burst detection.`,
        isGeminiGenerated: false,
        modelUsed: 'Local Smart Assistant'
      };
    }

    if (q.includes('irrigation') || q.includes('soil') || q.includes('garden') || q.includes('weather')) {
      return {
        reply: `### 🌿 Eco-Irrigation & Weather Status
- **Soil Moisture:** ${state.zones.zone3_irrigation.soilMoisturePct}% (Target: 45% - 70%)
- **Weather Condition:** ${state.weather.condition}, ${state.weather.temperatureC}°C
- **Rain Probability:** **${state.weather.rainProbabilityPct}%**
- **Autonomous Rule:** If rain probability exceeds 60% and soil moisture > 35%, irrigation valve is automatically locked to conserve up to 650 Liters per cycle.`,
        isGeminiGenerated: false,
        modelUsed: 'Local Smart Assistant'
      };
    }

    if (q.includes('report') || q.includes('audit')) {
      return {
        reply: `### 📋 Automated Water Conservation Audit Report
**Date:** ${new Date().toLocaleDateString()} | **Grid:** Metro Urban Eco-District
1. **Total Consumption:** ${state.metrics.totalWaterConsumedTodayLiters} Liters
2. **Autonomous Conservation:** ${state.metrics.totalWaterSavedTodayLiters} Liters (**+${state.metrics.conservationEfficiencyPct}% efficiency**)
3. **Reservoir Reserves:** ${state.reservoir.currentLiters} L / ${state.reservoir.capacityLiters} L (${state.reservoir.levelPercentage}%)
4. **Water Quality:** pH ${state.reservoir.waterQuality.ph}, Turbidity ${state.reservoir.waterQuality.turbidityNtu} NTU (${state.reservoir.waterQuality.status})
5. **Incidents Resolved:** ${state.tickets.length} automated work orders executed.

*You can print or download the complete certified audit certificate using the "Export Audit Report" button.*`,
        isGeminiGenerated: false,
        modelUsed: 'Local Smart Assistant'
      };
    }

    return {
      reply: `Hello! I am **AquaAgent Copilot**, managing our autonomous water conservation grid.
Here is what you can ask me:
1. *"How much water have we conserved today?"*
2. *"What is the status of the Sector 4 leak diagnostics?"*
3. *"Why was the park irrigation paused?"*
4. *"Generate a certified water conservation audit report"*
5. *"Simulate a 30% emergency drought rationing plan"*

*(Tip: Enter your Google Gemini API key in the top-right Settings to enable full multi-agent generative reasoning!)*`,
      isGeminiGenerated: false,
      modelUsed: 'Local Smart Assistant'
    };
  }
}

const geminiService = new GeminiService();
module.exports = geminiService;
