// LLM 调用服务
import { getLLMConfig, validateLLMConfig, type LLMConfig, type LLMProvider } from '../config/llm';

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

// 构建请求 URL
function buildUrl(config: LLMConfig): string {
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

  const response = await fetch(buildUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
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
  return response.content || response.reasoningContent || '';
}
