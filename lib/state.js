/**
 * Digital Twin State for Smart Water Conservation & Management Network
 */

class WaterSystemState {
  constructor() {
    this.systemMode = 'AUTONOMOUS'; // 'AUTONOMOUS', 'SEMI_AUTONOMOUS', 'MANUAL_OVERRIDE'
    this.geminiConfigured = false;
    this.lastTickTime = Date.now();
    this.dayTimeHours = 14.5; // Starts at 14:30 (2:30 PM)

    // Zone 1: Main Supply & Storage
    this.reservoir = {
      id: 'RES-01',
      name: 'Primary Rainwater & Municipal Reservoir',
      capacityLiters: 15000,
      currentLiters: 11400,
      levelPercentage: 76.0,
      inflowRateLpm: 25.0,
      outflowRateLpm: 32.0,
      pumpActive: true,
      waterQuality: {
        ph: 7.2,
        turbidityNtu: 1.4,
        status: 'OPTIMAL'
      }
    };

    // Distribution Zones
    this.zones = {
      zone1_residential: {
        id: 'ZONE-RES',
        name: 'Sector 4: High-Density Residential',
        currentFlowLpm: 28.4,
        baselineFlowLpm: 26.0,
        pressurePsi: 54.2,
        valveStatus: 'OPEN', // 'OPEN', 'THROTTLED', 'CLOSED'
        valveThrottlePct: 100,
        leakProbability: 0.05,
        leakClassification: 'NONE',
        anomalySeverity: 'NORMAL',
        smartMetersCount: 142
      },
      zone2_commercial: {
        id: 'ZONE-COMM',
        name: 'District Mall & Commercial Towers',
        currentFlowLpm: 36.2,
        baselineFlowLpm: 35.0,
        pressurePsi: 51.8,
        valveStatus: 'OPEN',
        valveThrottlePct: 100,
        leakProbability: 0.02,
        leakClassification: 'NONE',
        anomalySeverity: 'NORMAL',
        greywaterRecycledPct: 42.0
      },
      zone3_irrigation: {
        id: 'ZONE-AGRI',
        name: 'Botanical Park & Micro-Irrigation',
        currentFlowLpm: 0.0,
        baselineFlowLpm: 0.0,
        pressurePsi: 48.5,
        valveStatus: 'CLOSED',
        valveThrottlePct: 0,
        soilMoisturePct: 38.5, // 0-100%
        soilTargetMinMoisture: 45.0,
        soilTargetMaxMoisture: 70.0,
        irrigationStatus: 'IDLE', // 'IDLE', 'IRRIGATING', 'CANCELLED_RAIN_ANTICIPATED', 'SUSPENDED_DROUGHT'
        nextScheduledWindow: '18:00 - 18:30',
        waterAllocatedLiters: 650
      }
    };

    // Environmental & Weather Telemetry
    this.weather = {
      city: 'Metro Urban Eco-District',
      condition: 'Partly Cloudy', // 'Sunny', 'Rainy', 'Cloudy', 'Heatwave'
      temperatureC: 29.5,
      humidityPct: 58,
      rainProbabilityPct: 15,
      evapotranspirationMmPerDay: 4.8,
      windSpeedKmh: 12.0,
      forecastSummary: 'Scattered clouds, rain probability rising to 75% later in evening'
    };

    // Autonomous Conservation Performance Metrics
    this.metrics = {
      totalWaterConsumedTodayLiters: 18450,
      totalWaterSavedTodayLiters: 3820,
      totalCostSavedTodayUsd: 19.10, // ~ $5/1000L or ₹ equivalent
      carbonEmissionReducedKg: 4.58,
      anomaliesDetectedCount: 2,
      autonomousActionsExecutedCount: 7,
      conservationEfficiencyPct: 91.4
    };

    // Active Automation Scenarios & Simulation Triggers
    this.activeScenarios = []; // e.g., 'PIPE_BURST_ZONE1', 'SLOW_LEAK', 'HEATWAVE', 'HEAVY_RAIN'

    // Multi-Agent Swarm Operational States
    this.agents = {
      telemetryAgent: {
        name: 'TelemetrySensorAgent',
        role: 'Perception & Telemetry Streamer',
        status: 'OBSERVING', // 'OBSERVING', 'ANALYZING', 'ACTING', 'ALERT'
        lastThought: 'Ingesting 1Hz IoT sensor packet from 3 sectors and 142 smart meters.',
        lastAction: 'Published normalized telemetry frame',
        lastUpdated: Date.now()
      },
      leakDiagnosticAgent: {
        name: 'LeakDiagnosticAgent',
        role: 'Acoustic & Flow Anomaly Classifier',
        status: 'OBSERVING',
        lastThought: 'Pressure-flow signature matches diurnal usage pattern. Variance within ±3.2%.',
        lastAction: 'Calculated Minimum Night Flow (MNF) baseline',
        lastUpdated: Date.now()
      },
      irrigationOptimizerAgent: {
        name: 'EcoIrrigationAgent',
        role: 'Weather & Moisture Optimizer',
        status: 'DELIBERATING',
        lastThought: 'Checking ET rates (4.8mm/day) against Zone 3 soil moisture (38.5%). Rain probability trending up.',
        lastAction: 'Evaluating rain-delay rule engine for 18:00 cycle',
        lastUpdated: Date.now()
      },
      actuatorAgent: {
        name: 'AutomatedActuatorAgent',
        role: 'Autonomous Physical Control Runner',
        status: 'IDLE',
        lastThought: 'All smart valves standing by at programmed target positions.',
        lastAction: 'Telemetry heartbeat verified with valves V-101, V-102, V-103',
        lastUpdated: Date.now()
      },
      incidentAutomationAgent: {
        name: 'IncidentAutomationAgent',
        role: 'Work Orders & Emergency Dispatcher',
        status: 'IDLE',
        lastThought: 'Dispatch queues clear. 2 historical incidents logged and archived.',
        lastAction: 'Generated daily hourly conservation audit snippet',
        lastUpdated: Date.now()
      },
      supervisorAgent: {
        name: 'ConservationSupervisorAgent',
        role: 'Gemini-Powered Deliberative Brain',
        status: 'OBSERVING',
        lastThought: 'Swarm telemetry synchronized. Global conservation score at 91.4%.',
        lastAction: 'Validated multi-agent consensus',
        lastUpdated: Date.now()
      }
    };

    // Log Stream (Agent Thoughts, System Events, Tool Calls)
    this.logs = [
      {
        id: 'LOG-001',
        timestamp: new Date(Date.now() - 360000).toLocaleTimeString(),
        agent: 'SupervisorAgent',
        type: 'SYSTEM',
        badge: 'INIT',
        message: 'AquaAgent Autonomous Swarm initialized with 5 specialized sub-agents.'
      },
      {
        id: 'LOG-002',
        timestamp: new Date(Date.now() - 240000).toLocaleTimeString(),
        agent: 'EcoIrrigationAgent',
        type: 'OPTIMIZATION',
        badge: 'WEATHER_SYNC',
        message: 'Weather forecast synchronized: Rain probability 15% (updating dynamically).'
      },
      {
        id: 'LOG-003',
        timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
        agent: 'LeakDiagnosticAgent',
        type: 'HEALTH',
        badge: 'NORMAL_FLOW',
        message: 'All distribution flow rates within normal operational envelope.'
      }
    ];

    // Incident / Work Order Tickets
    this.tickets = [
      {
        id: 'TKT-2026-081',
        timestamp: new Date(Date.now() - 86400000).toLocaleString(),
        zone: 'Sector 4: Residential B',
        severity: 'LOW',
        type: 'MICRO_LEAK',
        status: 'RESOLVED',
        description: 'Nocturnal dripping toilet flapper identified via MNF analysis (3.8 L/min continuously between 02:00 and 04:30).',
        estimatedWaterSavedLiters: 480,
        automatedActionsTaken: ['Smart Meter SMS Notification sent to Tenant #B12', 'Secondary isolation valve throttled by 15%'],
        resolvedBy: 'Resident Maintenance Team'
      }
    ];

    // Time Series Buffer for Charts (last 20 readings)
    this.telemetryHistory = [];
    this._seedHistory();
  }

  _seedHistory() {
    const now = Date.now();
    for (let i = 19; i >= 0; i--) {
      const t = new Date(now - i * 3000);
      this.telemetryHistory.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        resFlow: Number((26 + Math.sin(i / 3) * 4).toFixed(1)),
        commFlow: Number((34 + Math.cos(i / 2) * 3).toFixed(1)),
        irrFlow: 0,
        pressure: Number((53 + Math.sin(i / 4) * 2).toFixed(1)),
        reservoirPct: Number((76 - (i * 0.05)).toFixed(1)),
        soilMoisture: Number((40 - (i * 0.1)).toFixed(1))
      });
    }
  }

  addLog(agent, type, badge, message) {
    const entry = {
      id: 'LOG-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      timestamp: new Date().toLocaleTimeString(),
      agent,
      type, // 'SYSTEM', 'ANOMALY', 'ACTUATION', 'OPTIMIZATION', 'GEMINI_REASONING', 'WARNING'
      badge,
      message
    };
    this.logs.unshift(entry);
    if (this.logs.length > 80) this.logs.pop();
    return entry;
  }

  addTicket(ticket) {
    this.tickets.unshift(ticket);
    if (this.tickets.length > 25) this.tickets.pop();
  }

  getSnapshot() {
    return {
      systemMode: this.systemMode,
      geminiConfigured: this.geminiConfigured,
      reservoir: this.reservoir,
      zones: this.zones,
      weather: this.weather,
      metrics: this.metrics,
      activeScenarios: this.activeScenarios,
      agents: this.agents,
      logs: this.logs.slice(0, 30),
      tickets: this.tickets,
      telemetryHistory: this.telemetryHistory.slice(-20)
    };
  }
}

const state = new WaterSystemState();
module.exports = state;
