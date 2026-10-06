const BaseAgent = require('./baseAgent');
const state = require('../state');

class LeakDiagnosticAgent extends BaseAgent {
  constructor() {
    super('leakDiagnosticAgent', 'LeakDiagnosticAgent', 'Acoustic & Flow Anomaly Classifier');
    this.analysisHistory = [];
  }

  evaluateAnomalies(telemetryAnomalies) {
    const zoneRes = state.zones.zone1_residential;
    const currentFlow = zoneRes.currentFlowLpm;
    const baseline = zoneRes.baselineFlowLpm;
    const pressure = zoneRes.pressurePsi;

    // 1. Catastrophic Burst Signature: Flow > 65 L/min AND Pressure < 32 PSI
    if (currentFlow > 65.0 && pressure < 32.0) {
      this.setStatus('ALERT');
      const lossRate = Number((currentFlow - baseline).toFixed(1));
      this.setThought(`CRITICAL DIAGNOSIS: Flow/Pressure divergence signature matches CATASTROPHIC PIPE BURST. Flow +${lossRate} L/min above baseline, pressure collapsed to ${pressure} PSI.`);
      this.setAction('Dispatched Emergency Incident Frame to SupervisorAgent');
      
      zoneRes.leakProbability = 0.98;
      zoneRes.leakClassification = 'PIPE_BURST';
      zoneRes.anomalySeverity = 'CRITICAL';

      this.log('ANOMALY', 'BURST_DETECTED', `Severe pipe burst detected in Sector 4! Estimated loss: ${lossRate} L/min.`);

      return {
        zoneKey: 'zone1_residential',
        zoneId: zoneRes.id,
        zoneName: zoneRes.name,
        anomalyType: 'PIPE_BURST',
        severity: 'CRITICAL',
        currentFlowLpm: currentFlow,
        baselineFlowLpm: baseline,
        pressurePsi: pressure,
        valveStatus: zoneRes.valveStatus,
        lossRateLpm: lossRate,
        confidence: 0.98
      };
    }

    // 2. Slow Nocturnal Leak / Dripping Fixture: Flow 35-50 L/min but baseline is 26, pressure normal
    if (currentFlow > 34.0 && currentFlow <= 60.0 && pressure >= 45.0) {
      this.setStatus('DELIBERATING');
      const lossRate = Number((currentFlow - baseline).toFixed(1));
      this.setThought(`DIAGNOSIS: Sustained baseline elevation (+${lossRate} L/min) with stable pressure. Signature indicates hidden residential micro-leak or running fixture.`);
      this.setAction('Classified as SLOW_NOCTURNAL_LEAK with 89% confidence');

      zoneRes.leakProbability = 0.82;
      zoneRes.leakClassification = 'SLOW_NOCTURNAL_LEAK';
      zoneRes.anomalySeverity = 'MEDIUM';

      this.log('ANOMALY', 'LEAK_CLASSIFIED', `Nocturnal micro-leak signature isolated in Sector 4. Loss rate: ${lossRate} L/min.`);

      return {
        zoneKey: 'zone1_residential',
        zoneId: zoneRes.id,
        zoneName: zoneRes.name,
        anomalyType: 'SLOW_NOCTURNAL_LEAK',
        severity: 'MEDIUM',
        currentFlowLpm: currentFlow,
        baselineFlowLpm: baseline,
        pressurePsi: pressure,
        valveStatus: zoneRes.valveStatus,
        lossRateLpm: lossRate,
        confidence: 0.89
      };
    }

    // Normal State
    if (zoneRes.leakClassification !== 'NONE' && currentFlow <= 34.0 && pressure >= 45.0) {
      zoneRes.leakProbability = 0.05;
      zoneRes.leakClassification = 'NONE';
      zoneRes.anomalySeverity = 'NORMAL';
      this.setStatus('OBSERVING');
      this.setThought('Flow and pressure signatures returned to normal diurnal variance.');
      this.setAction('Cleared zone anomaly flag');
    }

    return null;
  }
}

module.exports = new LeakDiagnosticAgent();
