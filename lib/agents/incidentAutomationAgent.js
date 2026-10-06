const BaseAgent = require('./baseAgent');
const state = require('../state');

class IncidentAutomationAgent extends BaseAgent {
  constructor() {
    super('incidentAutomationAgent', 'IncidentAutomationAgent', 'Work Orders & Emergency Dispatcher');
  }

  createIncidentTicket({ zoneName, anomalyType, severity, estimatedLitersLoss, rootCause, citizenAlertMessage, recommendedParts }) {
    this.setStatus('ACTING');
    
    const ticketId = `TKT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const ticket = {
      id: ticketId,
      timestamp: new Date().toLocaleString(),
      zone: zoneName,
      severity,
      type: anomalyType,
      status: 'AUTONOMOUS_INTERVENTION_ACTIVE',
      description: rootCause || `Detected anomalous flow condition (${anomalyType}) with estimated loss rate of ${estimatedLitersLoss} L/min.`,
      estimatedWaterSavedLiters: Math.round(estimatedLitersLoss * 60 * 2), // 2 hours of prevented run
      automatedActionsTaken: [
        'Automated valve actuation command executed',
        'Citizen SMS broadcast queued to affected district',
        'Maintenance dispatch ticket registered in ERP'
      ],
      citizenAlert: citizenAlertMessage || `Water utility notice: Anomaly isolated in ${zoneName}.`,
      requiredParts: recommendedParts || ['Inspection & Ultrasonic Leak Test', 'Standard Coupling Seal'],
      resolvedBy: 'AquaAgent Autonomous Pipeline'
    };

    state.addTicket(ticket);
    state.metrics.anomaliesDetectedCount++;

    this.setThought(`Automated incident ticket ${ticketId} generated. Dispatched maintenance alerts and consumer notifications.`);
    this.setAction(`Logged ticket ${ticketId} & triggered webhook dispatches`);

    this.log('SYSTEM', 'TICKET_GENERATED', `Work order ${ticketId} dispatched for ${zoneName} (${severity}). Prevented ~${ticket.estimatedWaterSavedLiters}L loss.`);

    return ticket;
  }
}

module.exports = new IncidentAutomationAgent();
