require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  SIMULATION_TICK_MS: parseInt(process.env.SIMULATION_TICK_MS || '2000', 10),
  // System Baseline Thresholds
  THRESHOLDS: {
    HIGH_FLOW_BURST_LPM: 75.0,        // Normal is 15-35 L/min
    LOW_PRESSURE_DROP_PSI: 28.0,      // Normal is 45-65 PSI
    NOCTURNAL_LEAK_LPM: 3.5,          // Above 3.5 L/min during 01:00 - 05:00
    CRITICAL_TANK_LOW_PCT: 20.0,      // Reservoir below 20%
    CRITICAL_TANK_HIGH_PCT: 95.0,     // Overflow risk
    SOIL_MOISTURE_CRITICAL_LOW: 30.0, // Needs watering
    SOIL_MOISTURE_SATURATED: 80.0,    // Waterlogged
    RAIN_CANCEL_PROBABILITY: 60       // % rain probability to cancel irrigation
  }
};
