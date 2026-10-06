const BaseAgent = require('./baseAgent');
const state = require('../state');

class IrrigationOptimizerAgent extends BaseAgent {
  constructor() {
    super('irrigationOptimizerAgent', 'EcoIrrigationAgent', 'Weather & Moisture Optimizer');
    this.lastWaterSaveCalcTime = Date.now();
  }

  evaluateIrrigationPolicy() {
    const agriZone = state.zones.zone3_irrigation;
    const weather = state.weather;
    const soilMoisture = agriZone.soilMoisturePct;
    const rainProb = weather.rainProbabilityPct;

    // Decision Logic:
    // Case 1: Rain is imminent (Rain Prob >= 60%) or it is currently raining
    if (rainProb >= 60 || weather.condition.toLowerCase().includes('rain')) {
      if (agriZone.irrigationStatus !== 'CANCELLED_RAIN_ANTICIPATED') {
        this.setStatus('DELIBERATING');
        this.setThought(`Rain probability is ${rainProb}%. Impending precipitation will recharge root zone. Intercepting scheduled irrigation cycle.`);
        this.setAction('Triggered automated Weather-Hold Interlock (Saving 650L)');
        
        agriZone.irrigationStatus = 'CANCELLED_RAIN_ANTICIPATED';
        agriZone.valveStatus = 'CLOSED';
        agriZone.valveThrottlePct = 0;
        agriZone.currentFlowLpm = 0.0;

        // Credit water savings
        state.metrics.totalWaterSavedTodayLiters += 650;
        state.metrics.totalCostSavedTodayUsd = Number((state.metrics.totalWaterSavedTodayLiters * 0.005).toFixed(2));
        state.metrics.carbonEmissionReducedKg = Number((state.metrics.totalWaterSavedTodayLiters * 0.0012).toFixed(2));
        state.metrics.autonomousActionsExecutedCount++;

        this.log('OPTIMIZATION', 'RAIN_HOLD', `Auto-cancelled scheduled park irrigation cycle due to ${rainProb}% rain forecast. Conserved 650 Liters!`);

        return {
          action: 'CANCEL_IRRIGATION',
          reason: `Rain forecast ${rainProb}% overrides watering schedule.`,
          savedLiters: 650
        };
      }
    }

    // Case 2: Severe Drought / Heatwave / Low Soil Moisture (< 32%) and Rain Prob < 20%
    if (soilMoisture < 32.0 && rainProb < 25 && agriZone.irrigationStatus !== 'IRRIGATING') {
      this.setStatus('ACTING');
      this.setThought(`Soil moisture critical (${soilMoisture}% < 32%). Evapotranspiration is high (${weather.evapotranspirationMmPerDay}mm/d). Activating targeted pulse irrigation.`);
      this.setAction('Commanded 15-minute precision micro-irrigation valve sequence');
      
      agriZone.irrigationStatus = 'IRRIGATING';
      agriZone.valveStatus = 'OPEN';
      agriZone.valveThrottlePct = 40; // Pulsed micro-irrigation, not full flood
      agriZone.currentFlowLpm = 18.5;

      this.log('OPTIMIZATION', 'PULSE_IRRIGATION', `Initiated precision pulse irrigation at 40% flow. Protecting botanical root zone while avoiding oversaturation.`);

      return {
        action: 'START_PULSE_IRRIGATION',
        flowRateLpm: 18.5,
        targetMoisturePct: 50.0
      };
    }

    // Case 3: Soil reached healthy saturation (> 55%) -> Shut off
    if (soilMoisture >= 55.0 && agriZone.irrigationStatus === 'IRRIGATING') {
      this.setStatus('OBSERVING');
      this.setThought(`Soil moisture reached target saturation (${soilMoisture}%). Terminating irrigation cycle to prevent runoff.`);
      this.setAction('Deactivated irrigation solenoid valve');
      
      agriZone.irrigationStatus = 'IDLE';
      agriZone.valveStatus = 'CLOSED';
      agriZone.valveThrottlePct = 0;
      agriZone.currentFlowLpm = 0.0;

      this.log('OPTIMIZATION', 'TARGET_REACHED', `Irrigation cycle completed. Soil moisture restored to ${soilMoisture}%.`);

      return {
        action: 'STOP_IRRIGATION',
        finalMoisturePct: soilMoisture
      };
    }

    return null;
  }
}

module.exports = new IrrigationOptimizerAgent();
