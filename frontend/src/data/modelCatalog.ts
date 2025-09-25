// Lightweight model catalog for the Model Garden – used to seed route targets
// Each entry provides a ModelProfile-like payload suitable for RouteTarget.profile

export interface CatalogItem {
  provider: string;
  endpoint: string;
  display_name?: string;
  profile: import('../types').ModelProfile;
}

const AU = 'AU';

function profile(input: Partial<import('../types').ModelProfile> & { provider: string; endpoint: string }): import('../types').ModelProfile {
  const { provider, endpoint, ...rest } = input as any;
  const base: import('../types').ModelProfile = {
    profile_id: `${provider}_${endpoint}`,
    provider,
    endpoint,
    capabilities: [],
    supported_data_classes: ['general'],
    compliance: { data_residency: AU, certifications: [], notes: undefined },
    performance: { avg_latency_ms: 200, p95_latency_ms: 350, availability: 0.99, throughput_tps: 20 },
    cost: { currency: 'AUD', per_1k_tokens: 0.01 },
    limits: { context_window_tokens: 8192, max_input_tokens: 8192, max_output_tokens: 2048 },
    quality: { strength: 'standard', score: undefined },
    last_benchmarked: new Date().toISOString(),
    tags: {},
  };
  const merged: import('../types').ModelProfile = {
    ...base,
    ...(rest as any),
    compliance: { ...base.compliance, ...(rest as any).compliance },
    performance: { ...base.performance, ...(rest as any).performance },
    cost: { ...base.cost, ...(rest as any).cost },
    limits: { ...base.limits, ...(rest as any).limits },
    quality: { ...base.quality, ...(rest as any).quality },
    tags: { ...base.tags, ...((rest as any).tags || {}) }
  };
  return merged;
}

export const MODEL_CATALOG: CatalogItem[] = [
  // OpenAI
  { provider: 'openai', endpoint: 'gpt-4o', display_name: 'GPT-4o (omni)', profile: profile({ provider: 'openai', endpoint: 'gpt-4o', capabilities: ['gpt-4o','vision-lite','audio'], quality: { strength: 'strong', score: 9.2 }, limits: { context_window_tokens: 128000, max_input_tokens: 128000, max_output_tokens: 8192 }, cost: { currency: 'AUD', per_1k_tokens: 0.018 } }) },
  { provider: 'openai', endpoint: 'gpt-4-turbo', display_name: 'GPT-4 Turbo', profile: profile({ provider: 'openai', endpoint: 'gpt-4-turbo', capabilities: ['json-mode'], quality: { strength: 'strong', score: 8.8 }, limits: { context_window_tokens: 128000, max_input_tokens: 128000, max_output_tokens: 8192 }, cost: { currency: 'AUD', per_1k_tokens: 0.016 } }) },
  { provider: 'openai', endpoint: 'gpt-3.5-turbo', display_name: 'GPT-3.5 Turbo', profile: profile({ provider: 'openai', endpoint: 'gpt-3.5-turbo', quality: { strength: 'standard', score: 7.0 }, limits: { context_window_tokens: 16385, max_input_tokens: 16385, max_output_tokens: 4096 }, cost: { currency: 'AUD', per_1k_tokens: 0.003 } }) },
  { provider: 'openai', endpoint: 'o1', display_name: 'o1 (reasoning)', profile: profile({ provider: 'openai', endpoint: 'o1', tags: { reasoning: true }, quality: { strength: 'strong', score: 9.0 }, limits: { context_window_tokens: 200000 }, cost: { currency: 'AUD', per_1k_tokens: 0.025 } }) },
  { provider: 'openai', endpoint: 'o1-mini', display_name: 'o1-mini', profile: profile({ provider: 'openai', endpoint: 'o1-mini', tags: { reasoning: true }, quality: { strength: 'standard', score: 8.0 }, limits: { context_window_tokens: 128000 }, cost: { currency: 'AUD', per_1k_tokens: 0.01 } }) },
  { provider: 'openai', endpoint: 'o3-mini', display_name: 'o3-mini', profile: profile({ provider: 'openai', endpoint: 'o3-mini', quality: { strength: 'standard', score: 8.2 } }) },
  { provider: 'openai', endpoint: 'o4-mini', display_name: 'o4-mini', profile: profile({ provider: 'openai', endpoint: 'o4-mini', quality: { strength: 'standard', score: 8.5 } }) },
  { provider: 'openai', endpoint: 'gpt-image-1', display_name: 'GPT-Image-1', profile: profile({ provider: 'openai', endpoint: 'gpt-image-1', capabilities: ['image-generation'], quality: { strength: 'standard', score: 7.5 } }) },
  { provider: 'openai', endpoint: 'dalle-3', display_name: 'DALL·E 3', profile: profile({ provider: 'openai', endpoint: 'dalle-3', capabilities: ['image-generation'], quality: { strength: 'standard', score: 7.3 } }) },
  { provider: 'openai', endpoint: 'whisper', display_name: 'Whisper', profile: profile({ provider: 'openai', endpoint: 'whisper', capabilities: ['speech-to-text'], quality: { strength: 'standard', score: 7.0 } }) },

  // Anthropic
  { provider: 'anthropic', endpoint: 'claude-3-5-sonnet', display_name: 'Claude 3.5 Sonnet', profile: profile({ provider: 'anthropic', endpoint: 'claude-3-5-sonnet', capabilities: ['multimodal','json-mode'], quality: { strength: 'strong', score: 9.0 }, limits: { context_window_tokens: 200000 }, cost: { currency: 'AUD', per_1k_tokens: 0.017 } }) },
  { provider: 'anthropic', endpoint: 'claude-3-5-haiku', display_name: 'Claude 3.5 Haiku', profile: profile({ provider: 'anthropic', endpoint: 'claude-3-5-haiku', quality: { strength: 'standard', score: 8.2 }, limits: { context_window_tokens: 200000 }, cost: { currency: 'AUD', per_1k_tokens: 0.007 } }) },
  { provider: 'anthropic', endpoint: 'claude-3-opus', display_name: 'Claude 3 Opus', profile: profile({ provider: 'anthropic', endpoint: 'claude-3-opus', quality: { strength: 'strong', score: 9.2 }, limits: { context_window_tokens: 200000 } }) },
  { provider: 'anthropic', endpoint: 'claude-3-haiku', display_name: 'Claude 3 Haiku', profile: profile({ provider: 'anthropic', endpoint: 'claude-3-haiku', quality: { strength: 'standard', score: 7.8 }, limits: { context_window_tokens: 200000 } }) },
  { provider: 'anthropic', endpoint: 'claude-2.1', display_name: 'Claude 2.1', profile: profile({ provider: 'anthropic', endpoint: 'claude-2.1', quality: { strength: 'standard', score: 7.5 } }) },

  // Google DeepMind
  { provider: 'google_generative_ai', endpoint: 'gemini-1.5-pro', display_name: 'Gemini 1.5 Pro', profile: profile({ provider: 'google_generative_ai', endpoint: 'gemini-1.5-pro', capabilities: ['multimodal'], quality: { strength: 'strong', score: 8.8 }, limits: { context_window_tokens: 1000000 } }) },
  { provider: 'google_generative_ai', endpoint: 'gemini-1.5-flash', display_name: 'Gemini 1.5 Flash', profile: profile({ provider: 'google_generative_ai', endpoint: 'gemini-1.5-flash', quality: { strength: 'standard', score: 8.0 }, limits: { context_window_tokens: 1000000 } }) },
  { provider: 'google_generative_ai', endpoint: 'gemini-1.0-ultra', display_name: 'Gemini 1.0 Ultra', profile: profile({ provider: 'google_generative_ai', endpoint: 'gemini-1.0-ultra', quality: { strength: 'strong', score: 8.7 } }) },
  { provider: 'google_generative_ai', endpoint: 'gemini-1.0-pro', display_name: 'Gemini 1.0 Pro', profile: profile({ provider: 'google_generative_ai', endpoint: 'gemini-1.0-pro', quality: { strength: 'standard', score: 8.1 } }) },
  { provider: 'google_generative_ai', endpoint: 'imagen-3', display_name: 'Imagen 3', profile: profile({ provider: 'google_generative_ai', endpoint: 'imagen-3', capabilities: ['image-generation'] }) },

  // Meta (Open Source)
  { provider: 'meta', endpoint: 'llama-3-70b', display_name: 'LLaMA 3 70B', profile: profile({ provider: 'meta', endpoint: 'llama-3-70b', quality: { strength: 'strong', score: 8.4 }, limits: { context_window_tokens: 8192 } }) },
  { provider: 'meta', endpoint: 'llama-3-8b', display_name: 'LLaMA 3 8B', profile: profile({ provider: 'meta', endpoint: 'llama-3-8b', quality: { strength: 'lite', score: 7.2 } }) },
  { provider: 'meta', endpoint: 'llama-2-70b', display_name: 'LLaMA 2 70B', profile: profile({ provider: 'meta', endpoint: 'llama-2-70b', quality: { strength: 'standard', score: 7.9 } }) },
  { provider: 'meta', endpoint: 'llama-2-13b', display_name: 'LLaMA 2 13B', profile: profile({ provider: 'meta', endpoint: 'llama-2-13b', quality: { strength: 'lite', score: 7.0 } }) },
  { provider: 'meta', endpoint: 'code-llama', display_name: 'Code LLaMA', profile: profile({ provider: 'meta', endpoint: 'code-llama', tags: { coding: true }, quality: { strength: 'standard', score: 7.5 } }) },

  // Mistral
  { provider: 'mistral', endpoint: 'mistral-7b', display_name: 'Mistral 7B', profile: profile({ provider: 'mistral', endpoint: 'mistral-7b', quality: { strength: 'lite', score: 7.0 } }) },
  { provider: 'mistral', endpoint: 'mixtral-8x7b', display_name: 'Mixtral 8x7B (MoE)', profile: profile({ provider: 'mistral', endpoint: 'mixtral-8x7b', quality: { strength: 'standard', score: 8.1 } }) },
  { provider: 'mistral', endpoint: 'mixtral-large', display_name: 'Mixtral-Large', profile: profile({ provider: 'mistral', endpoint: 'mixtral-large', quality: { strength: 'strong', score: 8.6 } }) },

  // Alibaba / Qwen
  { provider: 'qwen', endpoint: 'qwen-2.5-72b', display_name: 'Qwen 2.5 72B', profile: profile({ provider: 'qwen', endpoint: 'qwen-2.5-72b', quality: { strength: 'strong', score: 8.3 } }) },
  { provider: 'qwen', endpoint: 'qwen-2.5-14b', display_name: 'Qwen 2.5 14B', profile: profile({ provider: 'qwen', endpoint: 'qwen-2.5-14b', quality: { strength: 'standard', score: 7.6 } }) },
  { provider: 'qwen', endpoint: 'qwen-vl', display_name: 'Qwen-VL', profile: profile({ provider: 'qwen', endpoint: 'qwen-vl', capabilities: ['multimodal','vision'], quality: { strength: 'standard', score: 7.8 } }) },
  { provider: 'qwen', endpoint: 'qwen-coder', display_name: 'Qwen-Coder', profile: profile({ provider: 'qwen', endpoint: 'qwen-coder', tags: { coding: true }, quality: { strength: 'standard', score: 7.8 } }) },

  // xAI
  { provider: 'xai', endpoint: 'grok-2', display_name: 'Grok-2', profile: profile({ provider: 'xai', endpoint: 'grok-2', quality: { strength: 'strong', score: 8.2 } }) },
  { provider: 'xai', endpoint: 'grok-1.5', display_name: 'Grok-1.5', profile: profile({ provider: 'xai', endpoint: 'grok-1.5', quality: { strength: 'standard', score: 7.9 } }) },

  // Microsoft Phi
  { provider: 'microsoft', endpoint: 'phi-3-mini', display_name: 'Phi-3-mini', profile: profile({ provider: 'microsoft', endpoint: 'phi-3-mini', quality: { strength: 'lite', score: 7.1 }, cost: { currency: 'AUD', per_1k_tokens: 0.0005 } }) },
  { provider: 'microsoft', endpoint: 'phi-3-small', display_name: 'Phi-3-small', profile: profile({ provider: 'microsoft', endpoint: 'phi-3-small', quality: { strength: 'lite', score: 7.3 } }) },
  { provider: 'microsoft', endpoint: 'phi-2', display_name: 'Phi-2', profile: profile({ provider: 'microsoft', endpoint: 'phi-2', quality: { strength: 'lite', score: 6.9 } }) },

  // Other Open Source / Notable
  { provider: 'tii', endpoint: 'falcon-180b', display_name: 'Falcon 180B', profile: profile({ provider: 'tii', endpoint: 'falcon-180b', quality: { strength: 'strong', score: 8.0 } }) },
  { provider: 'tii', endpoint: 'falcon-40b', display_name: 'Falcon 40B', profile: profile({ provider: 'tii', endpoint: 'falcon-40b', quality: { strength: 'standard', score: 7.4 } }) },
  { provider: 'zhipuai', endpoint: 'glm-130b', display_name: 'GLM-130B', profile: profile({ provider: 'zhipuai', endpoint: 'glm-130b', quality: { strength: 'standard', score: 7.5 } }) },
  { provider: 'zhipuai', endpoint: 'chatglm-4', display_name: 'ChatGLM-4', profile: profile({ provider: 'zhipuai', endpoint: 'chatglm-4', quality: { strength: 'standard', score: 7.6 } }) },
  { provider: 'deepseek', endpoint: 'deepseek-coder', display_name: 'DeepSeek-Coder', profile: profile({ provider: 'deepseek', endpoint: 'deepseek-coder', tags: { coding: true }, quality: { strength: 'standard', score: 7.9 } }) },
  { provider: 'deepseek', endpoint: 'deepseek-llm', display_name: 'DeepSeek-LLM', profile: profile({ provider: 'deepseek', endpoint: 'deepseek-llm', quality: { strength: 'standard', score: 7.8 } }) },
  { provider: '01ai', endpoint: 'yi-34b', display_name: 'Yi-34B', profile: profile({ provider: '01ai', endpoint: 'yi-34b', quality: { strength: 'standard', score: 7.7 } }) },
  { provider: 'google', endpoint: 'gemma-7b', display_name: 'Gemma 7B', profile: profile({ provider: 'google', endpoint: 'gemma-7b', quality: { strength: 'lite', score: 7.0 } }) },
  { provider: 'openhermes', endpoint: 'openhermes-2.5', display_name: 'OpenHermes 2.5', profile: profile({ provider: 'openhermes', endpoint: 'openhermes-2.5', quality: { strength: 'lite', score: 6.8 } }) },
  { provider: 'huggingface', endpoint: 'zephyr-7b', display_name: 'Zephyr 7B', profile: profile({ provider: 'huggingface', endpoint: 'zephyr-7b', quality: { strength: 'lite', score: 6.9 } }) },
  { provider: 'wizardlm', endpoint: 'wizardlm', display_name: 'WizardLM', profile: profile({ provider: 'wizardlm', endpoint: 'wizardlm', tags: { coding: true }, quality: { strength: 'standard', score: 7.3 } }) },
  { provider: 'microsoft', endpoint: 'orca-2', display_name: 'Orca 2', profile: profile({ provider: 'microsoft', endpoint: 'orca-2', quality: { strength: 'lite', score: 6.9 } }) },
  { provider: 'vicuna', endpoint: 'vicuna-33b', display_name: 'Vicuna 33B', profile: profile({ provider: 'vicuna', endpoint: 'vicuna-33b', quality: { strength: 'standard', score: 7.6 } }) },
];

export default MODEL_CATALOG;
