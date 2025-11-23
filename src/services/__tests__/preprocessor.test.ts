import { PreprocessorService } from '../preprocessor';

describe('PreprocessorService', () => {
  const service = new PreprocessorService();

  it('enriches payload with rule insights for health content', () => {
    const enriched = service.enrich({
      messages: [{ role: 'user', content: 'Patient requires MRI results sent overseas.' }],
      destination_region: 'US'
    });

    expect(enriched.data_class).toBe('health_record');
    expect((enriched as any).__rule_insights).toBeDefined();
    const insights = (enriched as any).__rule_insights as Array<{ rule_id: string }>;
    expect(insights.some(insight => insight.rule_id === 'HEALTH_NO_OFFSHORE')).toBe(true);
  });
});


