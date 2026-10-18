/**
 * AI Recycling Advisor Service
 * Uses Groq (Ultra-fast LLM inference) via groq-sdk,
 * with strict deterministic safety overrides and rule-based fallback.
 */

const Groq = require('groq-sdk');
let GoogleGenAI;
try {
  GoogleGenAI = require('@google/genai').GoogleGenAI;
} catch (e) {}

// Deterministic safety guidelines and hazards per category
const DETERMINISTIC_SAFETY = {
  ENERGY_STORAGE: {
    hazard_level: 'High Hazard',
    substances: 'Lithium, Cadmium, Lead, Acid Electrolytes',
    warnings: [
      'CRITICAL: Swollen, leaking, or punctured batteries pose immediate fire and chemical burn hazards. Do NOT puncture, crush, or expose to heat/water.',
      'Always insulate metal contact terminals with non-conductive electrical tape before storage or transit.',
      'Never attempt to dismantle or pry open battery casings. Specialized hazardous waste recycling facility required.',
      'Keep away from flammable materials and domestic household waste bins.'
    ],
    preparation_steps: [
      'Inspect for swelling, leaks, or crusting around terminals.',
      'Tape both positive and negative terminals with electrical tape.',
      'Store in a cool, dry, fire-resistant non-metallic container.',
      'Schedule pickup with a certified hazardous battery recycler.'
    ],
    materials: ['Cobalt', 'Lithium', 'Nickel', 'Graphite', 'Copper foil']
  },
  DISPLAY_DEVICE: {
    hazard_level: 'Moderate to High Hazard',
    substances: 'Lead Glass (CRTs), Mercury Vapor (CCFL backlights), Arsenic, Cadmium',
    warnings: [
      'Do not crack, crush, or dismantle screen panels. CRT tubes contain vacuum implosion hazard and high-lead glass; older LCDs contain toxic mercury vapor lamps.',
      'Wear protective gloves when handling cracked glass or broken casings.',
      'Keep screens dry and upright during transit to prevent shattering.'
    ],
    preparation_steps: [
      'Unplug power cord and wrap neatly around the base or chassis.',
      'Inspect glass face for cracks or hairline fractures.',
      'Cover screen with cardboard or bubble wrap to prevent breakage during pickup.',
      'Factory-reset smart monitors / smart TVs to wipe stored accounts and Wi-Fi credentials.'
    ],
    materials: ['Glass', 'Indium Tin Oxide', 'Copper coils', 'Aluminum chassis', 'Rare earths']
  },
  COMMUNICATION_DEVICE: {
    hazard_level: 'Moderate Hazard',
    substances: 'Lithium-Ion cells, Brominated Flame Retardants, Heavy Metals',
    warnings: [
      'DATA PRIVACY ALERT: Smartphones and tablets hold sensitive personal, biometric, and financial data. Complete full factory reset before handover.',
      'Remove all SIM cards and external microSD storage cards.',
      'Do not bend or puncture device bodies containing sealed lithium polymer batteries.'
    ],
    preparation_steps: [
      'Perform complete cryptographic factory reset / wipe user accounts.',
      'Remove SIM card and MicroSD memory card.',
      'Ensure phone is powered down.',
      'Keep original charging cable or accessories together if functional.'
    ],
    materials: ['Gold (board pins)', 'Palladium', 'Silver', 'Tantalum', 'Copper', 'Lithium']
  },
  COMPUTER_SYSTEM: {
    hazard_level: 'Moderate Hazard',
    substances: 'Lead Solder, Beryllium, BFRs, Lithium CMOS cells',
    warnings: [
      'DATA PRIVACY ALERT: Hard drives and SSDs store confidential records. Perform secure multi-pass wipe or remove hard drives before recycling.',
      'Unplug power supply and discharge internal capacitors by holding power button for 10 seconds before disassembly.',
      'Avoid open torching or acid leaching of circuit boards — creates highly toxic fumes.'
    ],
    preparation_steps: [
      'Back up important personal files to cloud or external storage.',
      'Securely erase drives (using BitLocker erase, DBAN, or OS factory reset).',
      'Bundle power supply brick and peripheral cables alongside CPU/laptop unit.',
      'Wipe down surface dust with a dry cloth.'
    ],
    materials: ['High-yield Gold plating', 'Silver', 'Copper heatsinks', 'Aluminum housing', 'Steel']
  },
  STORAGE_DEVICE: {
    hazard_level: 'Data Security Priority',
    substances: 'Neodymium magnets, Aluminum platters, Gold flash contacts',
    warnings: [
      'DATA PRIVACY CRITICAL: Confidential files remain recoverable unless securely overwritten or demagnetized/shredded.',
      'Do not burn or incinerate drives.'
    ],
    preparation_steps: [
      'Perform DoD 5220.22-M multi-pass disk wipe or ATA secure erase.',
      'If device is dead, request physical degaussing or shredding certificate from certified recycler.',
      'Keep magnetic platters intact if selling for refurbishment.'
    ],
    materials: ['Neodymium magnets', 'Pure Aluminum', 'Gold contacts', 'Platinum platter alloy']
  },
  ELECTRONIC_COMPONENT: {
    hazard_level: 'Moderate Hazard',
    substances: 'Lead, Tin, Brominated resins',
    warnings: [
      'Store in static-shielding dry bags to preserve component integrity.',
      'Do not torch or heat boards with open flame.'
    ],
    preparation_steps: [
      'Sort components by board grade (motherboard, telecom board, power board).',
      'Remove oversized iron transformers or zinc heat shields if selling for board-weight.',
      'Box securely to avoid component snapping.'
    ],
    materials: ['Gold plating', 'Silver solder', 'Copper traces', 'Silicon wafer']
  },
  default: {
    hazard_level: 'Eco Standard',
    substances: 'Plastics, Copper, Mixed metals',
    warnings: [
      'Never dispose of electronics in municipal trash bins or open dumps.',
      'Keep dry and clean to ensure recyclers can salvage parts and raw materials safely.'
    ],
    preparation_steps: [
      'Unplug from mains electrical power completely.',
      'Wipe away excess dirt or grease.',
      'Keep accompanying cables and adapters packaged together.'
    ],
    materials: ['Copper wiring', 'Recyclable ABS/PC plastics', 'Steel', 'Aluminum']
  }
};

/**
 * Generate AI recycling advice using Gemini, with safety enforcement and fallback
 */
async function generateRecyclingAdvice(itemDetails) {
  const {
    detected_class = 'ELECTRONIC_COMPONENT',
    confidence = 0.85,
    user_category,
    condition = 'poor',
    item_name = 'E-Waste Item',
    notes = '',
    weight_kg = 1.0,
    quantity = 1
  } = itemDetails;

  const effectiveCategory = user_category || detected_class;
  const safetyBase = DETERMINISTIC_SAFETY[effectiveCategory] || DETERMINISTIC_SAFETY.default;

  // Rule-based fallback response generator
  const buildFallback = (confidenceNote = 'Standard deterministic recycling rules applied.') => {
    return {
      item_summary: `${condition.toUpperCase()} condition ${item_name || effectiveCategory.replace(/_/g, ' ')} (${quantity} unit, approx ${weight_kg}kg).`,
      classification: effectiveCategory,
      recycling_method: condition === 'good' ? 'Refurbishment & Component Reuse' : 'Material Recovery & Smelting',
      preparation_steps: safetyBase.preparation_steps,
      safety_warnings: safetyBase.warnings,
      recoverable_materials: safetyBase.materials.map(m => `Estimated potential: ${m}`),
      reuse_options: condition === 'good'
        ? ['Eligible for resale or donation to educational centers', 'Component harvesting for replacement spares']
        : ['Harvest passive components (capacitors, connectors)', 'Recycle chassis metals and plastics'],
      recommended_next_steps: [
        'Review safety warnings and apply contact terminal tape if applicable',
        'List item on RecycleAI Marketplace to receive competitive recycler bids',
        'Compare buyer bids and schedule doorstep pickup with verified recycler'
      ],
      recycler_search_category: effectiveCategory,
      estimated_value: null,
      confidence_note: confidenceNote,
      disclaimer: 'Model predictions and AI recommendations are advisories. A model prediction is never proof of safety. Always observe hazardous electrical protocols.'
    };
  };

  const prompt = `You are the RecycleAI Expert E-Waste Recycling & Hazardous Materials Advisor.
Analyze this e-waste classification and provide rigorous, practical advice.

Input:
- Detected Class: ${detected_class}
- Model Confidence: ${(confidence * 100).toFixed(1)}%
- Confirmed Category: ${effectiveCategory}
- Condition: ${condition}
- Item Description: ${item_name} ${notes ? `(${notes})` : ''}
- Weight / Quantity: ${weight_kg} kg, ${quantity} units

Rules:
1. NEVER fabricate exact commodity prices or guaranteed recovery percentages.
2. Emphasize data privacy wiping for phones, computers, and storage.
3. For batteries, enforce extreme fire caution, taped terminals, no punctures.
4. Output ONLY valid, parseable JSON conforming exactly to this structure without markdown wraps:
{
  "item_summary": "string",
  "classification": "${effectiveCategory}",
  "recycling_method": "string",
  "preparation_steps": ["step 1", "step 2", "step 3"],
  "safety_warnings": ["warning 1", "warning 2"],
  "recoverable_materials": ["potential material 1", "potential material 2"],
  "reuse_options": ["option 1", "option 2"],
  "recommended_next_steps": ["step 1", "step 2", "step 3"],
  "recycler_search_category": "${effectiveCategory}",
  "confidence_note": "string"
}`;

  // 1. Primary AI Provider: Groq (Ultra-fast inference)
  const groqApiKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  if (groqApiKey) {
    try {
      const groq = new Groq({ apiKey: groqApiKey });
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are the RecycleAI Expert E-Waste Recycling & Hazardous Materials Advisor. You analyze e-waste classification and provide rigorous, practical advice. Output ONLY valid parseable JSON conforming exactly to the requested schema.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        model: groqModel,
        response_format: { type: 'json_object' },
        temperature: 0.2
      });

      const text = completion.choices[0]?.message?.content?.trim() || '';
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed) {
        const mergedWarnings = Array.from(new Set([
          ...safetyBase.warnings,
          ...(parsed.safety_warnings || [])
        ]));

        return {
          ...parsed,
          classification: effectiveCategory,
          safety_warnings: mergedWarnings,
          ai_provider: 'Groq',
          disclaimer: 'RecycleAI advisory. Model predictions are never a guarantee of safety. Always handle potentially hazardous electronics with safety precautions.'
        };
      }
    } catch (groqErr) {
      console.warn('[AI Advisor] Groq API call error:', groqErr.message, '- Trying Gemini / fallback.');
    }
  }

  // 2. Secondary AI Provider: Gemini
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey && GoogleGenAI) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const text = response.text?.trim() || '';
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (parseErr) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      if (parsed) {
        const mergedWarnings = Array.from(new Set([
          ...safetyBase.warnings,
          ...(parsed.safety_warnings || [])
        ]));

        return {
          ...parsed,
          classification: effectiveCategory,
          safety_warnings: mergedWarnings,
          ai_provider: 'Gemini',
          disclaimer: 'RecycleAI advisory. Model predictions are never a guarantee of safety. Always handle potentially hazardous electronics with safety precautions.'
        };
      }
    } catch (geminiErr) {
      console.warn('[AI Advisor] Gemini API call error:', geminiErr.message, '- Using deterministic rules.');
    }
  }

  // 3. Deterministic expert rules fallback
  return buildFallback('Generated using RecycleAI verified e-waste protocols.');
}

module.exports = {
  generateRecyclingAdvice,
  DETERMINISTIC_SAFETY
};
