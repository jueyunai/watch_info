// LLM 调用服务
import { getLLMConfig, validateLLMConfig, getProviderPriority, needsThinkingMode, getThinkingBudget, needsThinkingBudgetOnly, type LLMConfig, type LLMProvider } from '../config/llm';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  reasoningContent?: string; // 推理模型的思考过程
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// 构建请求 URL（开发环境使用代理）
function buildUrl(config: LLMConfig): string {
  const isDev = import.meta.env.DEV;

  if (isDev) {
    // 开发环境：使用 Vite 代理绕过 CORS
    const proxyMap: Record<string, string> = {
      zhipu: '/llm-proxy/zhipu/v1/chat/completions',
      minimax: '/llm-proxy/minimax/v1/chat/completions',
      deepseek: '/llm-proxy/deepseek/v1/chat/completions',
      kimi: '/llm-proxy/kimi/v1/chat/completions',
      'ms-deepseek': '/llm-proxy/ms-deepseek/v1/chat/completions',
      'ms-qwen': '/llm-proxy/ms-qwen/v1/chat/completions',
    };
    if (proxyMap[config.provider]) {
      return proxyMap[config.provider];
    }
  }

  return config.baseUrl.includes('/chat/completions')
    ? config.baseUrl
    : `${config.baseUrl}/chat/completions`;
}

// 调用 LLM
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  provider?: LLMProvider
): Promise<ChatResponse> {
  const config = getLLMConfig(provider);

  if (!validateLLMConfig(config)) {
    throw new Error(`LLM 配置无效: ${config.provider}`);
  }

  console.log(`[LLM] 调用模型: ${config.provider} / ${config.model}`);
  console.log(`[LLM] API URL: ${buildUrl(config)}`);

  // 构建请求体
  const requestBody: Record<string, any> = {
    model: config.model,
    messages,
    max_tokens: options.maxTokens ?? 2048,
    temperature: options.temperature ?? 0.7,
  };

  // 推理模型需要开启思考模式
  if (needsThinkingMode(config.provider)) {
    requestBody.enable_thinking = true;
    const budget = getThinkingBudget(config.provider);
    if (budget) {
      requestBody.thinking_budget = budget;
    }
  }

  // Kimi (SiliconFlow) 只需要 thinking_budget，不需要 enable_thinking
  if (needsThinkingBudgetOnly(config.provider)) {
    const budget = getThinkingBudget(config.provider);
    if (budget) {
      requestBody.thinking_budget = budget;
    }
  }

  const response = await fetch(buildUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LLM 请求失败 (${response.status}): ${error}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  return {
    content: choice?.message?.content || '',
    reasoningContent: choice?.message?.reasoning_content,
    model: data.model,
    usage: data.usage ? {
      promptTokens: data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens: data.usage.total_tokens,
    } : undefined,
  };
}

// 带重试的多厂商调用
export async function chatWithFallback(
  messages: ChatMessage[],
  options: ChatOptions = {},
  providers?: LLMProvider[]
): Promise<ChatResponse> {
  const providerList = providers || getProviderPriority();

  for (const provider of providerList) {
    try {
      console.log(`[LLM] 尝试厂商: ${provider}`);
      return await chat(messages, options, provider);
    } catch (error) {
      console.warn(`[LLM] ${provider} 调用失败:`, error);
      if (provider === providerList[providerList.length - 1]) {
        throw error;
      }
    }
  }

  throw new Error('让子弹再飞一会，稍后重试哦～');
}

// 简化调用：单轮对话
export async function ask(
  prompt: string,
  systemPrompt?: string,
  options?: ChatOptions,
  provider?: LLMProvider
): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await chat(messages, options, provider);
  if (response.reasoningContent && response.content) {
    return `<think>${response.reasoningContent}</think>${response.content}`;
  }
  return response.content || response.reasoningContent || '';
}
