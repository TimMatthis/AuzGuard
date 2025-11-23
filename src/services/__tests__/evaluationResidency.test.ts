import { EvaluationService } from '../evaluation';

describe('EvaluationService residency resolution', () => {
  const service = new EvaluationService();
  const resolve = (policy: any, matchedRule?: string) =>
    (service as any).resolveResidencyRequirement(policy, matchedRule);

  it('honours policy override over rule requirements', () => {
    const policy = {
      residency_override: 'AU_ONSHORE',
      residency_requirement_default: 'AUTO',
      rules: [
        { rule_id: 'RULE_ONE', residency_requirement: 'ON_PREMISE' },
        { rule_id: 'RULE_TWO' }
      ]
    };

    expect(resolve(policy, 'RULE_ONE')).toBe('AU_ONSHORE');
    expect(resolve(policy, 'RULE_TWO')).toBe('AU_ONSHORE');
  });

  it('falls back to rule requirement, then policy default, then AUTO', () => {
    const policy = {
      residency_requirement_default: 'AU_ONSHORE',
      rules: [
        { rule_id: 'RULE_ONE', residency_requirement: 'ON_PREMISE' },
        { rule_id: 'RULE_TWO' }
      ]
    };

    expect(resolve(policy, 'RULE_ONE')).toBe('ON_PREMISE');
    expect(resolve(policy, 'RULE_TWO')).toBe('AU_ONSHORE');
    expect(resolve({ rules: [] })).toBe('AUTO');
  });
});





