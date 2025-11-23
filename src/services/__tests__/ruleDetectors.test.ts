import { runRuleDetectors } from '../ruleDetectors';
import { InspectionResult } from '../inspectionTypes';

describe('rule detectors', () => {
  it('detects health terminology and suggests data_class', () => {
    const inspection: InspectionResult = {
      message_text: 'Patient diagnosis includes pathology results that will be shared overseas.'
    };

    const { derivedFields, insights } = runRuleDetectors(
      { destination_region: 'US' },
      inspection
    );

    expect(derivedFields.data_class).toBe('health_record');
    expect(derivedFields.personal_information).toBe(true);
    expect(insights.some(i => i.rule_id === 'HEALTH_NO_OFFSHORE')).toBe(true);
  });

  it('signals CDR data when open banking terms appear', () => {
    const inspection: InspectionResult = {
      message_text: 'Please process this Consumer Data Right open banking feed with full transaction history.'
    };

    const { derivedFields, insights } = runRuleDetectors({}, inspection);

    expect(derivedFields.data_class).toBe('cdr_data');
    const cdrInsight = insights.find(i => i.rule_id === 'CDR_DATA_SOVEREIGNTY');
    expect(cdrInsight).toBeDefined();
    expect(cdrInsight?.signals?.length).toBeGreaterThan(0);
  });

  it('escalates AI bias risk when demographic attributes detected', () => {
    const inspection: InspectionResult = {
      message_text: 'Model must reason over race, gender and indigenous heritage to determine eligibility.'
    };

    const { derivedFields, insights } = runRuleDetectors({}, inspection);

    expect(derivedFields.data_class).toBe('demographic_data');
    expect(derivedFields.ai_risk_level).toBe('high');
    expect(insights.some(i => i.rule_id === 'AI_RISK_BIAS_AUDIT')).toBe(true);
  });
});


