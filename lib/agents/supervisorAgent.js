const BaseAgent = require('./baseAgent');
const state = require('../state');
const geminiService = require('../geminiService');
const actuatorAgent = require('./actuatorAgent');
const incidentAutomationAgent = require('./incidentAutomationAgent');

class SupervisorAgent extends BaseAgent {
  constructor() {
    super('supervisorAgent', 'ConservationSupervisorAgent', 'Gemini-Powered Deliberative Brain');
    this.isDeliberating = false;
    this.lastDeliberatedAnomaly = null;
  }

  async handleAnomaly(diagnosticReport) {
    if (this.isDeliberating) return;
    this.isDeliberating = true;
    this.setStatus('DELIBERATING');

    try {
      this.setThought(`Analyzing anomaly report from ${diagnosticReport.zoneName} (${diagnosticReport.anomalyType}). Invoking Gemini reasoning engine.`);
      this.setAction('Multi-agent synthesis in progress');

      const incidentContext = {
        zoneName: diagnosticReport.zoneName,
        zoneId: diagnosticReport.zoneId,
        anomalyType: diagnosticReport.anomalyType,
        severity: diagnosticReport.severity,
        currentFlowLpm: diagnosticReport.currentFlowLpm,
        baselineFlowLpm: diagnosticReport.baselineFlowLpm,
        pressurePsi: diagnosticReport.pressurePsi,
        valveStatus: diagnosticReport.valveStatus,
        soilMoisturePct: state.zones.zone3_irrigation.soilMoisturePct,
        weatherSummary: state.weather.forecastSummary,
        rainProbabilityPct: state.weather.rainProbabilityPct
      };

      // Call Gemini Deliberation
      const deliberation = await geminiService.deliberateIncident(incidentContext);

      this.setStatus('ACTING');
      this.setThought(deliberation.agentThinking);
      this.setAction(`Orchestrating response: ${deliberation.recommendedAction}`);

      // Log reasoning to system stream
      const badge = deliberation.isGeminiGenerated ? 'GEMINI_AI_REASONING' : 'AGENT_HEURISTIC';
      this.log('GEMINI_REASONING', badge, `[${deliberation.incidentSeverity}] ${deliberation.rootCauseAnalysis} Action: ${deliberation.recommendedAction}`);

      // Actuate based on decision
      if (deliberation.recommendedAction === 'SHUTOFF_VALVE' || deliberation.valveTargetPercentage === 0) {
        actuatorAgent.executeEmergencyShutoff(diagnosticReport.zoneKey, deliberation.rootCauseAnalysis);
      } else if (deliberation.recommendedAction.startsWith('THROTTLE') || deliberation.valveTargetPercentage < 100) {
        actuatorAgent.executeThrottle(diagnosticReport.zoneKey, deliberation.valveTargetPercentage || 50, deliberation.rootCauseAnalysis);
      }

      // Generate Ticket & Alert Dispatch
      incidentAutomationAgent.createIncidentTicket({
        zoneName: diagnosticReport.zoneName,
        anomalyType: diagnosticReport.anomalyType,
        severity: deliberation.incidentSeverity,
        estimatedLitersLoss: deliberation.estimatedLitersPerMinuteLoss || diagnosticReport.lossRateLpm || 25,
        rootCause: deliberation.rootCauseAnalysis,
        citizenAlertMessage: deliberation.citizenAlertMessage,
        recommendedParts: deliberation.workOrderParts
      });

      // Calculate water saved through early shutoff
      const saved = Math.round((deliberation.estimatedLitersPerMinuteLoss || 30) * 120); // 2 hours of saved flow
      state.metrics.totalWaterSavedTodayLiters += saved;
      state.metrics.totalCostSavedTodayUsd = Number((state.metrics.totalWaterSavedTodayLiters * 0.005).toFixed(2));
      state.metrics.carbonEmissionReducedKg = Number((state.metrics.totalWaterSavedTodayLiters * 0.0012).toFixed(2));

      this.lastDeliberatedAnomaly = diagnosticReport.anomalyType;
    } catch (err) {
      console.error('[SupervisorAgent] Error in deliberation:', err);
      this.setStatus('ALERT');
      this.setThought(`Error in deliberation pipeline: ${err.message}. Triggering failsafe shutoff.`);
      actuatorAgent.executeEmergencyShutoff(diagnosticReport.zoneKey, 'Failsafe Anomaly Interlock');
    } finally {
      this.isDeliberating = false;
    }
  }

  routineCoordination() {
    if (this.isDeliberating) return;

    this.setStatus('OBSERVING');
    const efficiency = state.metrics.conservationEfficiencyPct;
    const saved = state.metrics.totalWaterSavedTodayLiters;

    this.setThought(`Autonomous swarm in steady state. Real-time conservation efficiency at ${efficiency}%. Total water conserved: ${saved} L.`);
    this.setAction('Synchronized swarm consensus');
  }
}

module.exports = new SupervisorAgent();
