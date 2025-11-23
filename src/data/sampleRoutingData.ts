import { ModelPool, RouteTarget } from '../types';

const SAMPLE_TIMESTAMP = '2025-01-01T00:00:00.000Z';

export const sampleRouteTargets: RouteTarget[] = [
  {
    id: 'sample-rt-openai-gpt4omini',
    pool_id: 'onshore_default_pool',
    provider: 'openai',
    endpoint: 'gpt-4o-mini',
    weight: 60,
    region: 'AU',
    is_active: true,
    profile: {
      profile_id: 'openai_gpt4omini_au',
      provider: 'openai',
      endpoint: 'gpt-4o-mini',
      capabilities: ['gpt-4o-mini', 'json-mode', 'vision-lite'],
      supported_data_classes: ['cdr_data', 'general'],
      compliance: {
        data_residency: 'AU',
        certifications: ['IRAP'],
        notes: 'OpenAI regional deployment hosted in AU sovereign region.'
      },
      performance: {
        avg_latency_ms: 160,
        p95_latency_ms: 310,
        availability: 0.995,
        throughput_tps: 65
      },
      cost: {
        currency: 'AUD',
        per_1k_tokens: 0.011
      },
      limits: {
        context_window_tokens: 128000,
        max_input_tokens: 128000,
        max_output_tokens: 4096
      },
      quality: {
        strength: 'standard',
        score: 8.4
      },
      last_benchmarked: SAMPLE_TIMESTAMP,
      tags: {
        default_model: 'gpt-4o-mini',
        task_types: ['chat_completion', 'analysis'],
        cost_tier: 'balanced',
        irap: true,
        deployment: 'regional'
      }
    }
  },
  {
    id: 'sample-rt-gemini-15-pro',
    pool_id: 'onshore_default_pool',
    provider: 'google_generative_ai',
    endpoint: 'gemini-1.5-pro',
    weight: 25,
    region: 'AU',
    is_active: true,
    profile: {
      profile_id: 'gemini_15_pro_au',
      provider: 'google_generative_ai',
      endpoint: 'gemini-1.5-pro',
      capabilities: ['gemini-1.5-pro', 'multimodal'],
      supported_data_classes: ['cdr_data', 'general'],
      compliance: {
        data_residency: 'AU',
        certifications: ['IRAP', 'ISO27001']
      },
      performance: {
        avg_latency_ms: 210,
        p95_latency_ms: 340,
        availability: 0.992,
        throughput_tps: 50
      },
      cost: {
        currency: 'AUD',
        per_1k_tokens: 0.009
      },
      limits: {
        context_window_tokens: 100000,
        max_input_tokens: 100000,
        max_output_tokens: 8192
      },
      quality: {
        strength: 'standard',
        score: 8.1
      },
      last_benchmarked: SAMPLE_TIMESTAMP,
      tags: {
        default_model: 'gemini-1.5-pro',
        task_types: ['reasoning', 'multimodal'],
        cost_tier: 'value',
        deployment: 'regional'
      }
    }
  },
  {
    id: 'sample-rt-ollama-llama31',
    pool_id: 'onshore_default_pool',
    provider: 'ollama',
    endpoint: 'llama3.1',
    weight: 15,
    region: 'AU',
    is_active: true,
    profile: {
      profile_id: 'ollama_llama31_local',
      provider: 'ollama',
      endpoint: 'llama3.1',
      capabilities: ['chat', 'function-calling'],
      supported_data_classes: ['general'],
      compliance: {
        data_residency: 'AU',
        notes: 'Self-hosted deployment kept within sovereign network boundary.'
      },
      performance: {
        avg_latency_ms: 240,
        p95_latency_ms: 420,
        availability: 0.985,
        throughput_tps: 25
      },
      cost: {
        currency: 'AUD',
        per_1k_tokens: 0.003
      },
      limits: {
        context_window_tokens: 32000,
        max_input_tokens: 32000,
        max_output_tokens: 4096
      },
      quality: {
        strength: 'lite',
        score: 6.8
      },
      last_benchmarked: SAMPLE_TIMESTAMP,
      tags: {
        default_model: 'llama3.1:8b',
        task_types: ['chat_completion', 'development'],
        deployment: 'local',
        cost_tier: 'economy'
      }
    }
  },
  {
    id: 'sample-rt-ollama-phi3-mini',
    pool_id: 'sandbox_no_persist_pool',
    provider: 'ollama',
    endpoint: 'phi3-mini',
    weight: 100,
    region: 'AU',
    is_active: true,
    profile: {
      profile_id: 'ollama_phi3_sandbox',
      provider: 'ollama',
      endpoint: 'phi3-mini',
      capabilities: ['chat', 'code'],
      supported_data_classes: ['test_data'],
      compliance: {
        data_residency: 'AU',
        notes: 'Sandbox environment with ephemeral local storage.'
      },
      performance: {
        avg_latency_ms: 260,
        p95_latency_ms: 430,
        availability: 0.98,
        throughput_tps: 20
      },
      cost: {
        currency: 'AUD',
        per_1k_tokens: 0.0
      },
      limits: {
        context_window_tokens: 16000,
        max_input_tokens: 16000,
        max_output_tokens: 2048
      },
      quality: {
        strength: 'lite',
        score: 6.1
      },
      last_benchmarked: SAMPLE_TIMESTAMP,
      tags: {
        default_model: 'phi3:mini',
        sandbox: true,
        persistence: false,
        deployment: 'local',
        task_types: ['development', 'testing']
      }
    }
  },
  {
    id: 'sample-rt-openai-gpt4o',
    pool_id: 'bias_audited_pool',
    provider: 'openai',
    endpoint: 'gpt-4o',
    weight: 100,
    region: 'AU',
    is_active: true,
    profile: {
      profile_id: 'openai_gpt4o_audited',
      provider: 'openai',
      endpoint: 'gpt-4o',
      capabilities: ['gpt-4o', 'guardrails'],
      supported_data_classes: ['sensitive_personal', 'demographic_data'],
      compliance: {
        data_residency: 'AU',
        certifications: ['IRAP'],
        notes: 'Independent bias auditing completed Q2 2025 with quarterly refresh cadence.'
      },
      performance: {
        avg_latency_ms: 200,
        p95_latency_ms: 330,
        availability: 0.994,
        throughput_tps: 35
      },
      cost: {
        currency: 'AUD',
        per_1k_tokens: 0.018
      },
      limits: {
        context_window_tokens: 128000,
        max_input_tokens: 128000,
        max_output_tokens: 4096
      },
      quality: {
        strength: 'strong',
        score: 8.9
      },
      last_benchmarked: SAMPLE_TIMESTAMP,
      tags: {
        default_model: 'gpt-4o',
        task_types: ['high_risk', 'analysis'],
        bias_audited: true,
        cost_tier: 'premium'
      }
    }
  }
];

const baseModelPools: Array<Omit<ModelPool, 'target_profiles'>> = [
  {
    pool_id: 'onshore_default_pool',
    region: 'AU',
    description: 'Default Australian onshore pool optimised for compliance-first workloads',
    tags: { region: 'AU', persistence: true, default_pool: true },
    targets: [
      { provider: 'openai', endpoint: 'gpt-4o-mini', weight: 60 },
      { provider: 'google_generative_ai', endpoint: 'gemini-1.5-pro', weight: 25 },
      { provider: 'ollama', endpoint: 'llama3.1', weight: 15 }
    ],
    health: { status: 'healthy', last_check: SAMPLE_TIMESTAMP }
  },
  {
    pool_id: 'sandbox_no_persist_pool',
    region: 'AU',
    description: 'Local developer sandbox pool (no persistence)',
    tags: { region: 'AU', persistence: false, sandbox: true },
    targets: [
      { provider: 'ollama', endpoint: 'phi3-mini', weight: 100 }
    ],
    health: { status: 'healthy', last_check: SAMPLE_TIMESTAMP }
  },
  {
    pool_id: 'bias_audited_pool',
    region: 'AU',
    description: 'Bias-audited pool for sensitive and high-risk AI workloads',
    tags: { region: 'AU', bias_audited: true, compliance: 'high' },
    targets: [
      { provider: 'openai', endpoint: 'gpt-4o', weight: 100 }
    ],
    health: { status: 'healthy', last_check: SAMPLE_TIMESTAMP }
  }
];

export const sampleModelPools: ModelPool[] = baseModelPools.map(pool => ({
  ...pool,
  target_profiles: sampleRouteTargets.filter(target => target.pool_id === pool.pool_id)
}));



