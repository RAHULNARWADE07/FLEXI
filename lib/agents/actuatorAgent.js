const BaseAgent = require('./baseAgent');
const state = require('../state');

class ActuatorAgent extends BaseAgent {
  constructor() {
    super('actuatorAgent', 'AutomatedActuatorAgent', 'Autonomous Physical Control Runner');
  }

  executeValveCommand(zoneKey, targetStatus, throttlePct = 100, reason = 'Automated Agent Directive') {
    const zone = state.zones[zoneKey];
    if (!zone) return { success: false, message: 'Invalid zone' };

    if (state.systemMode === 'MANUAL_OVERRIDE') {
      this.setStatus('IDLE');
      this.setThought(`Actuation suppressed: System in MANUAL_OVERRIDE mode. Operator control active.`);
      this.setAction('Suppressed actuation due to manual interlock');
      return { success: false, message: 'Manual override active' };
    }

    this.setStatus('ACTING');
    this.setThought(`Executing physical valve state change on ${zone.name}: ${targetStatus} (${throttlePct}%). Reason: ${reason}`);
    this.setAction(`Commanded motorized valve actuator ${zone.id}`);

    zone.valveStatus = targetStatus;
    zone.valveThrottlePct = throttlePct;

    if (targetStatus === 'CLOSED' || throttlePct === 0) {
      zone.currentFlowLpm = 0.0;
      zone.pressurePsi = Number((zone.pressurePsi * 0.4).toFixed(1)); // Trapped residual pressure
    } else if (targetStatus === 'THROTTLED') {
      zone.currentFlowLpm = Number((zone.baselineFlowLpm * (throttlePct / 100)).toFixed(1));
      zone.pressurePsi = Number((zone.pressurePsi * 0.75).toFixed(1));
    }

    state.metrics.autonomousActionsExecutedCount++;

    this.log('ACTUATION', 'VALVE_COMMAND', `Valve for ${zone.name} adjusted to ${targetStatus} (${throttlePct}%). ${reason}`);

    return {
      success: true,
      zoneKey,
      valveStatus: zone.valveStatus,
      throttlePct: zone.valveThrottlePct,
      currentFlowLpm: zone.currentFlowLpm
    };
  }

  executeEmergencyShutoff(zoneKey, reason) {
    return this.executeValveCommand(zoneKey, 'CLOSED', 0, `EMERGENCY ISOLATION: ${reason}`);
  }

  executeThrottle(zoneKey, pct, reason) {
    return this.executeValveCommand(zoneKey, 'THROTTLED', pct, `CONSERVATION THROTTLE: ${reason}`);
  }

  executePumpControl(active, reason) {
    this.setStatus('ACTING');
    state.reservoir.pumpActive = active;
    this.setThought(`Primary distribution pump switched to ${active ? 'ONLINE' : 'STANDBY'}. Reason: ${reason}`);
    this.setAction(`Actuator relay signaled pump RES-01`);
    this.log('ACTUATION', 'PUMP_SWITCH', `Pump switched ${active ? 'ON' : 'OFF'}. ${reason}`);
    return { success: true, pumpActive: active };
  }
}

module.exports = new ActuatorAgent();
