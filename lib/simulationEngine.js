const state = require('./state');
const telemetryAgent = require('./agents/telemetryAgent');
const leakDiagnosticAgent = require('./agents/leakDiagnosticAgent');
const irrigationOptimizerAgent = require('./agents/irrigationOptimizerAgent');
const supervisorAgent = require('./agents/supervisorAgent');
const actuatorAgent = require('./agents/actuatorAgent');

class SimulationEngine {
  constructor() {
    this.interval = null;
    this.sseClients = [];
    this.tickCount = 0;
    this.scenarioTimer = null;
  }

  start(tickMs = 2000) {
    if (this.interval) clearInterval(this.interval);
    this.interval = setInterval(() => this.tick(), tickMs);
    console.log(`[SimulationEngine] Started autonomous simulation loop (${tickMs}ms tick).`);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
  }

  addSseClient(res) {
    this.sseClients.push(res);
  }

  removeSseClient(res) {
    this.sseClients = this.sseClients.filter(c => c !== res);
  }

  broadcast(eventName, data) {
    const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(payload);
      } catch (err) {
        // Handled on client close
      }
    }
  }

  tick() {
    this.tickCount++;

    // 1. Time & Weather Drift
    this._updateEnvironmentalDrift();

    // 2. Zone Physics & Hydrodynamics
    this._simulateHydraulics();

    // 3. Multi-Agent Sense-Reason-Act Pipeline
    const telemetryAnomalies = telemetryAgent.processSensorTick();

    // Leak Diagnostics
    const diagnosticReport = leakDiagnosticAgent.evaluateAnomalies(telemetryAnomalies);
    if (diagnosticReport) {
      supervisorAgent.handleAnomaly(diagnosticReport);
    } else if (this.tickCount % 4 === 0) {
      supervisorAgent.routineCoordination();
    }

    // Irrigation Optimization
    irrigationOptimizerAgent.evaluateIrrigationPolicy();

    // 4. Record to historical telemetry buffer for UI charts
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    state.telemetryHistory.push({
      time: timeStr,
      resFlow: state.zones.zone1_residential.currentFlowLpm,
      commFlow: state.zones.zone2_commercial.currentFlowLpm,
      irrFlow: state.zones.zone3_irrigation.currentFlowLpm,
      pressure: state.zones.zone1_residential.pressurePsi,
      reservoirPct: state.reservoir.levelPercentage,
      soilMoisture: state.zones.zone3_irrigation.soilMoisturePct
    });

    if (state.telemetryHistory.length > 25) {
      state.telemetryHistory.shift();
    }

    // 5. Broadcast real-time snapshot over SSE to all browser tabs
    this.broadcast('state_update', state.getSnapshot());
  }

  _updateEnvironmentalDrift() {
    // Increment virtual day clock slightly
    state.dayTimeHours = (state.dayTimeHours + 0.02) % 24;

    // Small weather variations if no active scenario overrides
    if (!state.activeScenarios.includes('HEATWAVE') && !state.activeScenarios.includes('RAIN_STORM')) {
      state.weather.temperatureC = Number((28 + Math.sin(this.tickCount / 15) * 3).toFixed(1));
      state.weather.humidityPct = Number((55 + Math.cos(this.tickCount / 12) * 8).toFixed(0));
    }
  }

  _simulateHydraulics() {
    const res = state.zones.zone1_residential;
    const comm = state.zones.zone2_commercial;
    const agri = state.zones.zone3_irrigation;

    // 1. Residential Flow Behavior
    if (res.valveStatus === 'CLOSED') {
      res.currentFlowLpm = 0.0;
      res.pressurePsi = 18.2; // Depressurized line
    } else if (res.valveStatus === 'THROTTLED') {
      const target = (res.baselineFlowLpm * (res.valveThrottlePct / 100));
      res.currentFlowLpm = Number((target + (Math.random() - 0.5) * 1.5).toFixed(1));
      res.pressurePsi = 38.5;
    } else if (state.activeScenarios.includes('PIPE_BURST')) {
      // Pipe Burst Scenario: Surge in flow, crash in pressure
      res.currentFlowLpm = Number((86.5 + (Math.random() - 0.5) * 5.0).toFixed(1));
      res.pressurePsi = Number((22.4 + (Math.random() - 0.5) * 2.0).toFixed(1));
    } else if (state.activeScenarios.includes('SLOW_LEAK')) {
      // Slow leak: Elevated baseline
      res.currentFlowLpm = Number((42.8 + (Math.random() - 0.5) * 2.0).toFixed(1));
      res.pressurePsi = 52.1;
    } else {
      // Normal flow with gentle diurnal variation
      const normalVariance = Math.sin(this.tickCount / 6) * 3;
      res.currentFlowLpm = Number((res.baselineFlowLpm + normalVariance).toFixed(1));
      res.pressurePsi = Number((53.5 + (Math.random() - 0.5) * 1.8).toFixed(1));
    }

    // 2. Commercial Flow
    if (comm.valveStatus === 'OPEN') {
      comm.currentFlowLpm = Number((comm.baselineFlowLpm + Math.sin(this.tickCount / 8) * 2.5).toFixed(1));
    }

    // 3. Irrigation Soil Dynamics
    if (agri.irrigationStatus === 'IRRIGATING') {
      agri.soilMoisturePct = Math.min(85, Number((agri.soilMoisturePct + 1.2).toFixed(1)));
    } else if (state.weather.condition === 'Heavy Rain' || state.activeScenarios.includes('RAIN_STORM')) {
      agri.soilMoisturePct = Math.min(90, Number((agri.soilMoisturePct + 1.8).toFixed(1)));
    } else {
      // Soil slowly dries by evapotranspiration
      agri.soilMoisturePct = Math.max(18, Number((agri.soilMoisturePct - 0.15).toFixed(1)));
    }

    // 4. Reservoir Level Dynamics
    const totalOutflow = res.currentFlowLpm + comm.currentFlowLpm + agri.currentFlowLpm;
    state.reservoir.outflowRateLpm = Number(totalOutflow.toFixed(1));

    let netFlow = state.reservoir.inflowRateLpm - totalOutflow;
    if (state.activeScenarios.includes('RAIN_STORM')) {
      netFlow += 45; // Rain catchment boost
    }

    const literChange = (netFlow / 60) * 2; // for 2-second tick
    state.reservoir.currentLiters = Math.max(800, Math.min(state.reservoir.capacityLiters, Number((state.reservoir.currentLiters + literChange).toFixed(1))));
    state.reservoir.levelPercentage = Number(((state.reservoir.currentLiters / state.reservoir.capacityLiters) * 100).toFixed(1));

    // Cumulative water consumption
    state.metrics.totalWaterConsumedTodayLiters += Math.round(totalOutflow * (2 / 60));
  }

  // Scenario Injectors
  triggerScenario(scenarioType) {
    console.log(`[SimulationEngine] Triggering scenario: ${scenarioType}`);
    
    // Clear any previous scenario timer
    if (this.scenarioTimer) clearTimeout(this.scenarioTimer);

    if (scenarioType === 'PIPE_BURST') {
      state.activeScenarios = ['PIPE_BURST'];
      state.zones.zone1_residential.currentFlowLpm = 89.2;
      state.zones.zone1_residential.pressurePsi = 22.0;
      state.zones.zone1_residential.valveStatus = 'OPEN';
      state.zones.zone1_residential.valveThrottlePct = 100;
      state.addLog('SystemSimulator', 'ANOMALY', 'SCENARIO_INJECTED', '💥 Scenario Injected: High-Pressure Main Line Rupture in Sector 4 (89.2 L/min, 22 PSI).');
    } else if (scenarioType === 'SLOW_LEAK') {
      state.activeScenarios = ['SLOW_LEAK'];
      state.zones.zone1_residential.currentFlowLpm = 44.5;
      state.zones.zone1_residential.valveStatus = 'OPEN';
      state.zones.zone1_residential.valveThrottlePct = 100;
      state.addLog('SystemSimulator', 'ANOMALY', 'SCENARIO_INJECTED', '💧 Scenario Injected: Nocturnal Micro-Leakage / Running Fixture in Sector 4 (44.5 L/min).');
    } else if (scenarioType === 'RAIN_STORM') {
      state.activeScenarios = ['RAIN_STORM'];
      state.weather.condition = 'Heavy Rain';
      state.weather.rainProbabilityPct = 88;
      state.weather.temperatureC = 21.0;
      state.weather.humidityPct = 94;
      state.weather.forecastSummary = 'Severe thunderstorm warning: Heavy rainfall expected (>40mm).';
      state.addLog('SystemSimulator', 'OPTIMIZATION', 'SCENARIO_INJECTED', '🌧️ Scenario Injected: Sudden Rainstorm (88% rain probability).');
    } else if (scenarioType === 'HEATWAVE') {
      state.activeScenarios = ['HEATWAVE'];
      state.weather.condition = 'Extreme Heat';
      state.weather.temperatureC = 39.5;
      state.weather.humidityPct = 22;
      state.weather.rainProbabilityPct = 5;
      state.weather.evapotranspirationMmPerDay = 8.5;
      state.zones.zone3_irrigation.soilMoisturePct = 27.5;
      state.addLog('SystemSimulator', 'WARNING', 'SCENARIO_INJECTED', '☀️ Scenario Injected: Heatwave & Drought Stress (39.5°C, Soil Moisture 27.5%).');
    } else if (scenarioType === 'RESET_NORMAL') {
      state.activeScenarios = [];
      state.systemMode = 'AUTONOMOUS';
      
      // Reset Zone 1
      state.zones.zone1_residential.valveStatus = 'OPEN';
      state.zones.zone1_residential.valveThrottlePct = 100;
      state.zones.zone1_residential.currentFlowLpm = 27.5;
      state.zones.zone1_residential.pressurePsi = 54.0;
      state.zones.zone1_residential.leakClassification = 'NONE';
      state.zones.zone1_residential.anomalySeverity = 'NORMAL';
      state.zones.zone1_residential.leakProbability = 0.04;

      // Reset Zone 2
      state.zones.zone2_commercial.valveStatus = 'OPEN';
      state.zones.zone2_commercial.valveThrottlePct = 100;

      // Reset Zone 3
      state.zones.zone3_irrigation.irrigationStatus = 'IDLE';
      state.zones.zone3_irrigation.valveStatus = 'CLOSED';
      state.zones.zone3_irrigation.valveThrottlePct = 0;
      state.zones.zone3_irrigation.currentFlowLpm = 0.0;
      state.zones.zone3_irrigation.soilMoisturePct = 48.0;

      // Reset Weather
      state.weather.condition = 'Partly Cloudy';
      state.weather.temperatureC = 28.5;
      state.weather.humidityPct = 58;
      state.weather.rainProbabilityPct = 15;
      state.weather.evapotranspirationMmPerDay = 4.8;
      state.weather.forecastSummary = 'Scattered clouds, moderate temperatures, stable conditions.';

      state.addLog('SystemSimulator', 'SYSTEM', 'GRID_RESET', '🔄 System reset to normal baseline conditions. All smart valves reset.');
    }

    this.tick();
    return { success: true, scenario: scenarioType, activeScenarios: state.activeScenarios };
  }
}

const simulationEngine = new SimulationEngine();
module.exports = simulationEngine;
