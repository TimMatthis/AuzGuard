import { InspectionResult } from './inspectionTypes';
import { RuleInsight } from '../types';

type DetectorContext = {
  payload: Record<string, unknown>;
  inspection: InspectionResult;
};

interface DetectorResult {
  fields?: Record<string, unknown>;
  insights?: RuleInsight | RuleInsight[];
}

type DetectorFn = (context: DetectorContext) => DetectorResult | null;

const HEALTH_TERMS = [
  'patient',
  'diagnosis',
  'symptom',
  'medical history',
  'clinic',
  'surgery',
  'oncology',
  'radiology',
  'prescription',
  'medication',
  'blood pressure',
  'heart rate',
  'imaging',
  'ct scan',
  'mri',
  'x-ray',
  'pathology',
  'lab result'
];

const CDR_TERMS = [
  'cdr',
  'consumer data right',
  'open banking',
  'bank statement',
  'transaction history',
  'bsb',
  'account number',
  'loan application',
  'credit bureau',
  'apra',
  'accc'
];

const DEMOGRAPHIC_TERMS = [
  'race',
  'ethnicity',
  'gender',
  'sexual orientation',
  'religion',
  'demographic',
  'protected attribute',
  'aboriginal',
  'torres strait',
  'indigenous',
  'disability',
  'lgbt',
  'lgbtq',
  'income bracket',
  'socioeconomic',
  'cultural background'
];

const SUMMARIZATION_TERMS = [
  'summarize',
  'summarise',
  'summary',
  'tl;dr',
  'condense',
  'brief',
  'short version',
  'paraphrase',
  'explain shortly',
  'outline'
];

const DETECTORS: DetectorFn[] = [
  detectHealthData,
  detectCreditCardData,
  detectSensitiveIdentifiers,
  detectRiskyContent,
  detectProfanity,
  detectCopyrightSummaries,
  detectPIIRedaction,
  detectApp8Overrides,
  detectCDRData,
  detectAIRisk,
  detectSandboxContext
];

export function runRuleDetectors(
  payload: Record<string, unknown>,
  inspection: InspectionResult
): { derivedFields: Record<string, unknown>; insights: RuleInsight[] } {
  const derivedFields: Record<string, unknown> = {};
  const insights: RuleInsight[] = [];

  for (const detector of DETECTORS) {
    const result = detector({ payload: { ...payload, ...derivedFields }, inspection });
    if (!result) continue;
    if (result.fields && Object.keys(result.fields).length > 0) {
      Object.assign(derivedFields, result.fields);
    }
    if (result.insights) {
      const list = Array.isArray(result.insights) ? result.insights : [result.insights];
      for (const entry of list) {
        if (entry) {
          insights.push(normalizeInsight(entry));
        }
      }
    }
  }

  return { derivedFields, insights };
}

function detectHealthData({ payload, inspection }: DetectorContext): DetectorResult | null {
  const text = normalizeText(inspection.message_text);
  if (!text) return null;
  const matches = findMatches(text, HEALTH_TERMS);
  if (!matches.length) return null;

  const fields: Record<string, unknown> = {};
  if (!isString(payload['data_class'])) {
    fields['data_class'] = 'health_record';
  }
  if (payload['personal_information'] !== true) {
    fields['personal_information'] = true;
  }

  const missingFields = deriveMissingFields(payload, ['destination_region']);

  return {
    fields,
    insights: createInsight('HEALTH_NO_OFFSHORE', {
      signals: matches,
      suggestedFields: fields,
      missingFields,
      baseConfidence: Math.min(1, matches.length / 3),
      notes: missingFields.length
        ? 'Health terms detected; cross-border context required to trigger block.'
        : 'Health terms detected; ensure destination region is outside AU to block.'
    })
  };
}

function detectCreditCardData({ inspection }: DetectorContext): DetectorResult | null {
  const cardSignals = inspection.detected?.credit_cards ?? [];
  const hasCard = cardSignals.length > 0 || inspection.pii_types?.includes('credit_card');
  if (!hasCard) return null;

  return {
    insights: createInsight('CREDIT_CARD_OFFSHORE_BLOCK', {
      signals: cardSignals.length ? cardSignals : ['credit_card_pattern'],
      baseConfidence: cardSignals.length ? 1 : 0.7,
      notes: 'Credit card pattern detected in payload.'
    })
  };
}

function detectSensitiveIdentifiers({ inspection }: DetectorContext): DetectorResult | null {
  const signals = new Set<string>();
  (inspection.detected?.id_numbers || []).forEach(value => signals.add(value));
  (inspection.detected?.abns || []).forEach(value => signals.add(`ABN:${value}`));
  (inspection.detected?.tfns || []).forEach(value => signals.add(`TFN:${value}`));
  (inspection.detected?.ssns || []).forEach(value => signals.add(`SSN:${value}`));
  if (inspection.pii_types?.includes('id_number')) {
    signals.add('id_number');
  }

  if (!signals.size) return null;

  return {
    insights: createInsight('SENSITIVE_IDS_STRICT', {
      signals: Array.from(signals),
      baseConfidence: Math.min(1, signals.size / 2),
      notes: 'Sensitive identifier detected in message content.'
    })
  };
}

function detectRiskyContent({ inspection }: DetectorContext): DetectorResult | null {
  const flags = (inspection.risk_flags || []).filter(flag =>
    ['hate', 'violence', 'adult', 'self_harm'].includes(flag)
  );
  if (!flags.length) return null;

  return {
    insights: createInsight('RISK_CONTENT_GUARD', {
      signals: flags,
      baseConfidence: Math.min(1, 0.6 + flags.length * 0.1),
      notes: 'High-risk content category detected.'
    })
  };
}

function detectProfanity({ inspection }: DetectorContext): DetectorResult | null {
  const profanities = inspection.detected?.profanities || [];
  if (!profanities.length) return null;

  const insightOptions = {
    signals: profanities,
    baseConfidence: Math.min(1, 0.5 + profanities.length * 0.1)
  };

  return {
    insights: [
      createInsight('PROFANITY_BLOCK_STRICT', {
        ...insightOptions,
        notes: 'Profanity detected; production/external contexts will be blocked.'
      }),
      createInsight('PROFANITY_WARN_INTERNAL', {
        ...insightOptions,
        notes: 'Profanity detected; internal/staff audiences will warn & route.'
      })
    ]
  };
}

function detectCopyrightSummaries({ payload, inspection }: DetectorContext): DetectorResult | null {
  const text = normalizeText(inspection.message_text);
  if (!text) return null;

  const summarySignals = findMatches(text, SUMMARIZATION_TERMS);
  const signals = [...summarySignals];
  if (inspection.possible_copyrighted) {
    signals.push('possible_copyrighted');
  }

  if (!signals.length) return null;

  const fields: Record<string, unknown> = {};
  if (!isString(payload['purpose']) && summarySignals.length) {
    fields['purpose'] = 'summarization';
  }

  return {
    fields,
    insights: createInsight('COPYRIGHT_SUMMARIZATION_WARN_ROUTE', {
      signals,
      suggestedFields: fields,
      baseConfidence: Math.min(1, 0.4 + signals.length * 0.1),
      notes: 'Summarization intent and/or copyrighted material detected.'
    })
  };
}

function detectPIIRedaction({ inspection }: DetectorContext): DetectorResult | null {
  if (!inspection.contains_pii) return null;

  const signals = inspection.pii_types?.length ? inspection.pii_types : ['contains_pii'];
  return {
    insights: createInsight('PII_REDACT_ROUTE', {
      signals,
      baseConfidence: 0.8,
      notes: 'PII detected; traffic should be routed to onshore pool.'
    })
  };
}

function detectApp8Overrides({ payload, inspection }: DetectorContext): DetectorResult | null {
  const personalInfo = inspection.contains_pii || payload['personal_information'] === true;
  if (!personalInfo) return null;

  const missingFields = deriveMissingFields(payload, ['destination_region']);

  return {
    insights: createInsight('PRIV_APP8_CROSS_BORDER', {
      signals: ['personal_information'],
      baseConfidence: 0.65,
      missingFields,
      notes: missingFields.length
        ? 'Personal information present; add destination_region to evaluate APP8.'
        : 'Personal information present; cross-border transfer requires override.'
    })
  };
}

function detectCDRData({ payload, inspection }: DetectorContext): DetectorResult | null {
  const text = normalizeText(inspection.message_text);
  const matches = findMatches(text, CDR_TERMS);
  if (!matches.length) return null;

  const fields: Record<string, unknown> = {};
  if (!isString(payload['data_class'])) {
    fields['data_class'] = 'cdr_data';
  }

  return {
    fields,
    insights: createInsight('CDR_DATA_SOVEREIGNTY', {
      signals: matches,
      suggestedFields: fields,
      baseConfidence: Math.min(1, matches.length / 3),
      notes: 'CDR/Open banking terminology detected.'
    })
  };
}

function detectAIRisk({ payload, inspection }: DetectorContext): DetectorResult | null {
  const text = normalizeText(inspection.message_text);
  const matches = findMatches(text, DEMOGRAPHIC_TERMS);
  if (!matches.length) return null;

  const fields: Record<string, unknown> = {};
  if (!isString(payload['data_class'])) {
    fields['data_class'] = 'demographic_data';
  }
  if (!isString(payload['ai_risk_level'])) {
    fields['ai_risk_level'] = 'high';
  }

  return {
    fields,
    insights: createInsight('AI_RISK_BIAS_AUDIT', {
      signals: matches,
      suggestedFields: fields,
      baseConfidence: Math.min(1, 0.5 + matches.length * 0.1),
      notes: 'Demographic/protected attribute indicators detected.'
    })
  };
}

function detectSandboxContext({ payload }: DetectorContext): DetectorResult | null {
  const environment = typeof payload['environment'] === 'string' ? payload['environment'].toLowerCase() : '';
  if (!['sandbox', 'testing', 'development'].includes(environment)) {
    return null;
  }

  return {
    insights: createInsight('SANDBOX_NO_PERSIST', {
      signals: [environment],
      baseConfidence: 0.9,
      notes: 'Sandbox/testing environment detected; route to non-persistent pool.'
    })
  };
}

function normalizeText(value?: string): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function findMatches(text: string, keywords: string[]): string[] {
  if (!text) return [];
  const matches: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      matches.push(keyword);
    }
  }
  return matches;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function deriveMissingFields(payload: Record<string, unknown>, requiredFields: string[]): string[] {
  const missing: string[] = [];
  for (const field of requiredFields) {
    if (typeof payload[field] === 'undefined' || payload[field] === null || payload[field] === '') {
      missing.push(field);
    }
  }
  return missing;
}

function createInsight(
  ruleId: string,
  options: {
    signals: string[];
    suggestedFields?: Record<string, unknown>;
    missingFields?: string[];
    baseConfidence?: number;
    notes?: string;
  }
): RuleInsight {
  const uniqueSignals = Array.from(new Set(options.signals.filter(Boolean)));
  return normalizeInsight({
    rule_id: ruleId,
    confidence: clamp01(options.baseConfidence ?? (uniqueSignals.length ? Math.min(1, uniqueSignals.length / 4) : 0.4)),
    signals: uniqueSignals.slice(0, 10),
    suggested_fields:
      options.suggestedFields && Object.keys(options.suggestedFields).length > 0
        ? options.suggestedFields
        : undefined,
    missing_fields: options.missingFields && options.missingFields.length ? options.missingFields : undefined,
    notes: options.notes
  });
}

function normalizeInsight(insight: RuleInsight): RuleInsight {
  return {
    ...insight,
    confidence: clamp01(insight.confidence),
    signals: insight.signals || []
  };
}

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}


