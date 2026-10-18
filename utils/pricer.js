function getPrice(itemType, condition) {
  const basePrices = {
    COMPUTER_SYSTEM: 1500,
    DISPLAY_DEVICE: 800,
    COMMUNICATION_DEVICE: 1000,
    STORAGE_DEVICE: 200,
    ENERGY_STORAGE: 100,
    ELECTRONIC_COMPONENT: 50,
    AUDIO_DEVICE: 300,
    KITCHEN_APPLIANCE: 600,
    LARGE_HOME_APPLIANCE: 2500,
    TOOLS_DEVICE: 400,
    MEDICAL_DEVICE: 1200,
    SMART_SENSOR_DEVICE: 350,
    INPUT_DEVICE: 150,
    unknown: 100
  };

  const conditionMultipliers = {
    good: 1.2,
    fair: 0.8,
    poor: 0.5,
    'non-working': 0.5,
    damaged: 0.3
  };

  const basePrice = basePrices[itemType] || basePrices.unknown;
  const multiplier = conditionMultipliers[condition] || conditionMultipliers['non-working'];
  
  const estimated = Math.round(basePrice * multiplier);
  const min = Math.round(estimated * 0.8);
  const max = Math.round(estimated * 1.2);

  // Approx 2.4kg of CO2 saved per 1000 rupees of value
  const co2_saved = parseFloat(((estimated / 1000) * 2.4).toFixed(1));

  return { estimated_value: estimated, min_value: min, max_value: max, co2_saved };
}

module.exports = { getPrice };
