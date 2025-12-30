// LLM 调用客户端
import { type Provider, type ProviderConfig, getProviderConfig, validateConfig } from './config.js';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PerformanceMetrics {
  startTime: number;
  ttft: number;           // Time to First Token (ms)
  totalTime: number;      // Total response time (ms)
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tps: number;            // Tokens per second
}

export interface ChatResult {
  content: string;
  reasoningContent: string;
  reasoningFormat: 'field' | 'tag' | 'none';
  metrics: PerformanceMetrics;
  model: string;
  rawResponse?: any;
}

// 构建请求 URL
function buildUrl(config: ProviderConfig): string {
  const baseUrl = config.baseUrl;
  if (baseUrl.includes('/chat/completions')) {
    return baseUrl;
  }
  return `${baseUrl}/chat/completions`;
}

// 解析 SSE 流式响应
async function* parseSSEStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<any> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;

      const rawData = trimmed.replace(/^data:\s*/, '');
      if (rawData === '[DONE]') continue;

      try {
        yield JSON.parse(rawData);
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// 从内容中提取 <think> 标签
function extractThinkTag(content: string): { thinking: string; final: string } {
  const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/i);
  if (thinkMatch) {
    const thinking = thinkMatch[1].trim();
    const final = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { thinking, final };
  }
  return { thinking: '', final: content };
}

// 调用 LLM（流式）
export async function chat(
  provider: Provider,
  messages: Message[],
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<ChatResult> {
  const config = getProviderConfig(provider);
  
  if (!validateConfig(config)) {
    throw new Error(`配置无效: ${provider}`);
  }

  const url = buildUrl(config);
  console.log(`[LLM] 调用 ${provider} / ${config.model}`);
  console.log(`[LLM] URL: ${url}`);

  const startTime = performance.now();
  let ttft = 0;
  let content = '';
  let reasoningContent = '';
  let reasoningFormat: 'field' | 'tag' | 'none' = 'none';
  let inputTokens = 0;
  let outputTokens = 0;

  // 构建请求体
  const requestBody: Record<string, any> = {
    model: config.model,
    messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.7,
    stream: true,
  };

  // DeepSeek 和 ModelScope 模型需要开启思考模式
  if (provider === 'deepseek' || provider === 'ms-deepseek' || provider === 'ms-glm' || provider === 'ms-qwen') {
    requestBody.enable_thinking = true;
  }

  // Kimi (SiliconFlow) 使用 thinking_budget 控制思考链长度
  // Kimi-K2-Thinking 本身就是思考模型，不需要 enable_thinking
  if (provider === 'kimi') {
    requestBody.thinking_budget = 2048;  // 限制思考链长度
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  let isFirstToken = true;

  for await (const chunk of parseSSEStream(reader)) {
    const choice = chunk.choices?.[0];
    if (!choice) continue;

    // 记录首 Token 时间
    if (isFirstToken) {
      ttft = performance.now() - startTime;
      isFirstToken = false;
    }

    // 处理 reasoning_content 字段（推理模型）
    const reasoningDelta = choice.delta?.reasoning_content || '';
    if (reasoningDelta) {
      reasoningContent += reasoningDelta;
      if (reasoningFormat === 'none') {
        reasoningFormat = 'field';
      }
    }

    // 处理 content 字段
    const contentDelta = choice.delta?.content || '';
    if (contentDelta) {
      content += contentDelta;
    }

    // 提取 usage 信息（部分厂商在最后一个 chunk 返回）
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens || 0;
      outputTokens = chunk.usage.completion_tokens || 0;
    }
  }

  const totalTime = performance.now() - startTime;

  // 检查内容中是否有 <think> 标签
  if (reasoningFormat === 'none' && content.includes('<think>')) {
    const extracted = extractThinkTag(content);
    reasoningContent = extracted.thinking;
    content = extracted.final;
    reasoningFormat = 'tag';
  }

  // 如果没有获取到 Token 统计，估算输出 Token 数（中文约 2 字符/token）
  if (outputTokens === 0) {
    const totalContent = content + reasoningContent;
    outputTokens = Math.ceil(totalContent.length / 2);
  }

  // 计算 TPS
  const totalTokens = inputTokens + outputTokens;
  const tps = outputTokens > 0 && totalTime > 0 
    ? outputTokens / (totalTime / 1000) 
    : 0;

  return {
    content,
    reasoningContent,
    reasoningFormat,
    model: config.model,
    metrics: {
      startTime,
      ttft: Math.round(ttft),
      totalTime: Math.round(totalTime),
      inputTokens,
      outputTokens,
      totalTokens,
      tps: Math.round(tps * 100) / 100,
    },
  };
}
