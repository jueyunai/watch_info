// 大模型配置

export type LLMProvider = 'openai' | 'anthropic' | 'qwen' | 'deepseek' | 'zhipu' | 'minimax' | 'kimi' | 'ms-deepseek' | 'ms-qwen';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 从环境变量获取配置
function getProviderConfig(provider: LLMProvider): { apiKey: string; baseUrl: string; model: string } {
  const configs: Record<LLMProvider, { apiKey: string; baseUrl: string; model: string }> = {
    openai: {
      apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
      baseUrl: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o',
    },
    anthropic: {
      apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
      baseUrl: import.meta.env.VITE_ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
      model: import.meta.env.VITE_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    },
    qwen: {
      apiKey: import.meta.env.VITE_QWEN_API_KEY || '',
      baseUrl: import.meta.env.VITE_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: import.meta.env.VITE_QWEN_MODEL || 'qwen-plus',
    },
    deepseek: {
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
      baseUrl: import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
    },
    zhipu: {
      apiKey: import.meta.env.VITE_ZHIPU_API_KEY || '',
      baseUrl: import.meta.env.VITE_ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: import.meta.env.VITE_ZHIPU_MODEL || 'glm-4-flash',
    },
    minimax: {
      apiKey: import.meta.env.VITE_MINIMAX_API_KEY || '',
      baseUrl: import.meta.env.VITE_MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
      model: import.meta.env.VITE_MINIMAX_MODEL || 'abab6.5s-chat',
    },
    kimi: {
      apiKey: import.meta.env.VITE_KIMI_API_KEY || '',
      baseUrl: import.meta.env.VITE_KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
      model: import.meta.env.VITE_KIMI_MODEL || 'moonshot-v1-8k',
    },
    'ms-deepseek': {
      apiKey: import.meta.env.VITE_MS_DEEPSEEK_API_KEY || '',
      baseUrl: import.meta.env.VITE_MS_DEEPSEEK_BASE_URL || 'https://api-inference.modelscope.cn/v1',
      model: import.meta.env.VITE_MS_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-R1-0528',
    },
    'ms-qwen': {
      apiKey: import.meta.env.VITE_MS_QWEN_API_KEY || '',
      baseUrl: import.meta.env.VITE_MS_QWEN_BASE_URL || 'https://api-inference.modelscope.cn/v1',
      model: import.meta.env.VITE_MS_QWEN_MODEL || 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    },
  };
  return configs[provider];
}

// 需要开启思考模式的厂商（使用 enable_thinking 参数）
export function needsThinkingMode(provider: LLMProvider): boolean {
  // 注意：kimi (SiliconFlow) 的 Kimi-K2-Thinking 模型不支持 enable_thinking
  // 它使用 thinking_budget 参数控制思考链长度
  return ['deepseek', 'ms-deepseek', 'ms-qwen'].includes(provider);
}

// 获取思考预算（控制思考链长度）
export function getThinkingBudget(provider: LLMProvider): number | undefined {
  // kimi (SiliconFlow) 使用 thinking_budget 参数
  if (provider === 'kimi') {
    return 2048;
  }
  return undefined;
}

// 是否需要 thinking_budget 参数（不需要 enable_thinking）
export function needsThinkingBudgetOnly(provider: LLMProvider): boolean {
  return provider === 'kimi';
}

// 获取当前 LLM 配置
export function getLLMConfig(overrideProvider?: LLMProvider): LLMConfig {
  const provider = overrideProvider ||
    (import.meta.env.VITE_LLM_PROVIDER as LLMProvider) ||
    'openai';

  const { apiKey, baseUrl, model } = getProviderConfig(provider);

  return { provider, apiKey, baseUrl, model };
}

// 验证配置是否有效
export function validateLLMConfig(config: LLMConfig): boolean {
  return !!(config.apiKey && config.baseUrl && config.model);
}

// 获取厂商优先级列表
export function getProviderPriority(): LLMProvider[] {
  const providers = import.meta.env.VITE_LLM_PROVIDERS;
  if (providers) {
    return providers.split(',').map((p: string) => p.trim()) as LLMProvider[];
  }
  return ['openai'];
}
