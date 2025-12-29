import type { VercelRequest, VercelResponse } from '@vercel/node';

// 支持的 LLM 厂商
type LLMProvider = 'minimax' | 'zhipu' | 'deepseek' | 'qwen' | 'openai';

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 从环境变量获取厂商配置
function getProviderConfig(provider: LLMProvider): LLMConfig | null {
  const configs: Record<LLMProvider, LLMConfig> = {
    minimax: {
      apiKey: process.env.VITE_MINIMAX_API_KEY || '',
      baseUrl: process.env.VITE_MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
      model: process.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.1',
    },
    zhipu: {
      apiKey: process.env.VITE_ZHIPU_API_KEY || '',
      baseUrl: process.env.VITE_ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.VITE_ZHIPU_MODEL || 'glm-4-flash',
    },
    deepseek: {
      apiKey: process.env.VITE_DEEPSEEK_API_KEY || '',
      baseUrl: process.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
    },
    qwen: {
      apiKey: process.env.VITE_QWEN_API_KEY || '',
      baseUrl: process.env.VITE_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.VITE_QWEN_MODEL || 'qwen-plus',
    },
    openai: {
      apiKey: process.env.VITE_OPENAI_API_KEY || '',
      baseUrl: process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.VITE_OPENAI_MODEL || 'gpt-4o',
    },
  };

  const config = configs[provider];
  return config?.apiKey ? config : null;
}

// 获取优先级列表
function getProviderPriority(): LLMProvider[] {
  const providers = process.env.VITE_LLM_PROVIDERS || 'minimax,zhipu,deepseek';
  return providers.split(',').map(p => p.trim()) as LLMProvider[];
}

function buildUrl(baseUrl: string): string {
  return baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
}

// 调用单个厂商
async function callProvider(config: LLMConfig, messages: any[], stream: boolean) {
  const response = await fetch(buildUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${config.model} 调用失败 (${response.status}): ${error}`);
  }

  return response;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, stream = false, provider: requestedProvider } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages' });
    }

    // 确定要尝试的厂商列表
    let providers: LLMProvider[];
    if (requestedProvider) {
      // 前端指定了厂商，只用这一个
      providers = [requestedProvider as LLMProvider];
    } else {
      // 使用优先级列表
      providers = getProviderPriority();
    }

    console.log(`[LLM] 厂商优先级: ${providers.join(' → ')}`);

    // 依次尝试各厂商
    let lastError: Error | null = null;
    for (const provider of providers) {
      const config = getProviderConfig(provider);
      if (!config) {
        console.log(`[LLM] ${provider} 未配置，跳过`);
        continue;
      }

      try {
        console.log(`[LLM] 尝试: ${provider} / ${config.model}`);
        const response = await callProvider(config, messages, stream);

        // 流式响应
        if (stream && response.body) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value));
          }
          res.end();
          return;
        }

        // 非流式响应
        const data = await response.json();
        console.log(`[LLM] ${provider} 调用成功`);
        return res.status(200).json({
          ...data,
          _provider: provider, // 返回实际使用的厂商
        });
      } catch (error) {
        console.error(`[LLM] ${provider} 失败:`, error);
        lastError = error as Error;
        // 继续尝试下一个
      }
    }

    // 所有厂商都失败
    return res.status(500).json({
      error: '所有 LLM 厂商调用失败',
      details: lastError?.message,
    });
  } catch (error) {
    console.error('[LLM] 代理错误:', error);
    res.status(500).json({
      error: 'LLM proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
