const BaseAgent = require('./baseAgent');
const state = require('../state');

class TelemetryAgent extends BaseAgent {
  constructor() {
    super('telemetryAgent', 'TelemetrySensorAgent', 'Perception & Telemetry Streamer');
    this.sampleCount = 0;
  }

  processSensorTick() {
    this.sampleCount++;
    this.setStatus('OBSERVING');

    const resFlow = state.zones.zone1_residential.currentFlowLpm;
    const resPress = state.zones.zone1_residential.pressurePsi;
    const commFlow = state.zones.zone2_commercial.currentFlowLpm;
    const tankPct = state.reservoir.levelPercentage;
    const soilPct = state.zones.zone3_irrigation.soilMoisturePct;

    // Routine perception updates
    if (this.sampleCount % 5 === 0) {
      this.setThought(`Continuous IoT stream active. Monitoring 142 meters. Sector 4: ${resFlow} L/min, Grid Pressure: ${resPress} PSI, Reservoir: ${tankPct}%.`);
      this.setAction('Normalized & verified sensor signals');
    }

    // Telemetry boundary check
    const anomalies = [];

    // Check Sector 1 Residential
    if (resFlow > 65.0) {
      anomalies.push({
        zoneKey: 'zone1_residential',
        zoneName: state.zones.zone1_residential.name,
        type: 'FLOW_SURGE',
        value: resFlow,
        metric: 'L/min',
        severity: resFlow > 80.0 ? 'CRITICAL' : 'HIGH'
      });
    }

    if (resPress < 30.0) {
      anomalies.push({
        zoneKey: 'zone1_residential',
        zoneName: state.zones.zone1_residential.name,
        type: 'PRESSURE_COLLAPSE',
        value: resPress,
        metric: 'PSI',
        severity: 'CRITICAL'
      });
    }

    // Check Reservoir Tank Levels
    if (tankPct < 15.0) {
      anomalies.push({
        zoneKey: 'reservoir',
        zoneName: state.reservoir.name,
        type: 'RESERVOIR_DEPLETION',
        value: tankPct,
        metric: '%',
        severity: 'CRITICAL'
      });
    } else if (tankPct > 96.0) {
      anomalies.push({
        zoneKey: 'reservoir',
        zoneName: state.reservoir.name,
        type: 'OVERFLOW_RISK',
        value: tankPct,
        metric: '%',
        severity: 'MEDIUM'
      });
    }

    if (anomalies.length > 0) {
      this.setStatus('ALERT');
      this.setThought(`Telemetry boundary breached! Detected ${anomalies.map(a => a.type).join(', ')}. Routing to LeakDiagnosticAgent.`);
      this.setAction(`Broadcast ${anomalies.length} anomaly telemetry vectors`);
      return anomalies;
    }

    return [];
  }
}

module.exports = new TelemetryAgent();
