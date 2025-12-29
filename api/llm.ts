import type { VercelRequest, VercelResponse } from '@vercel/node';

// LLM 配置（从环境变量读取）
function getLLMConfig() {
  const provider = process.env.VITE_LLM_PROVIDER || 'deepseek';
  
  const configs: Record<string, { apiKey: string; baseUrl: string; model: string }> = {
    openai: {
      apiKey: process.env.VITE_OPENAI_API_KEY || '',
      baseUrl: process.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.VITE_OPENAI_MODEL || 'gpt-4o',
    },
    qwen: {
      apiKey: process.env.VITE_QWEN_API_KEY || '',
      baseUrl: process.env.VITE_QWEN_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      model: process.env.VITE_QWEN_MODEL || 'qwen-plus',
    },
    deepseek: {
      apiKey: process.env.VITE_DEEPSEEK_API_KEY || '',
      baseUrl: process.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
    },
    zhipu: {
      apiKey: process.env.VITE_ZHIPU_API_KEY || '',
      baseUrl: process.env.VITE_ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.VITE_ZHIPU_MODEL || 'glm-4-flash',
    },
    minimax: {
      apiKey: process.env.VITE_MINIMAX_API_KEY || '',
      baseUrl: process.env.VITE_MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
      model: process.env.VITE_MINIMAX_MODEL || 'abab6.5s-chat',
    },
  };

  return configs[provider] || configs.deepseek;
}

function buildUrl(baseUrl: string): string {
  return baseUrl.includes('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
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
    const { messages, stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages' });
    }

    const config = getLLMConfig();
    
    if (!config.apiKey) {
      return res.status(500).json({ error: 'LLM API key not configured' });
    }

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
      console.error('LLM API error:', error);
      return res.status(response.status).json({ error: 'LLM API error', details: error });
    }

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
    } else {
      // 非流式响应
      const data = await response.json();
      res.status(200).json(data);
    }
  } catch (error) {
    console.error('LLM proxy error:', error);
    res.status(500).json({
      error: 'LLM proxy error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
