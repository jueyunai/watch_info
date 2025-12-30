// 简单测试各 LLM 厂商连通性
// 运行: npx tsx test-llm.ts

import 'dotenv/config';

const providers = [
  {
    name: 'minimax',
    url: process.env.VITE_MINIMAX_BASE_URL + '/chat/completions',
    key: process.env.VITE_MINIMAX_API_KEY,
    model: process.env.VITE_MINIMAX_MODEL,
  },
  {
    name: 'zhipu',
    url: process.env.VITE_ZHIPU_BASE_URL,
    key: process.env.VITE_ZHIPU_API_KEY,
    model: process.env.VITE_ZHIPU_MODEL,
  },
  {
    name: 'deepseek',
    url: process.env.VITE_DEEPSEEK_BASE_URL + '/chat/completions',
    key: process.env.VITE_DEEPSEEK_API_KEY,
    model: process.env.VITE_DEEPSEEK_MODEL,
  },
];

async function testProvider(p: typeof providers[0]) {
  console.log(`\n测试 ${p.name}...`);
  console.log(`  模型: ${p.model}`);
  console.log(`  URL: ${p.url}`);

  if (!p.key) {
    console.log(`  ❌ API Key 未配置`);
    return;
  }

  try {
    const start = Date.now();
    const res = await fetch(p.url!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${p.key}`,
      },
      body: JSON.stringify({
        model: p.model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 50,
        stream: true,
      }),
    });

    const elapsed = Date.now() - start;

    if (!res.ok) {
      const err = await res.text();
      console.log(`  ❌ HTTP ${res.status}: ${err.slice(0, 200)}`);
      return;
    }

    console.log(`  ✅ 连接成功 (${elapsed}ms)，开始接收流...`);

    const reader = res.body;
    if (!reader) {
      console.log(`  ❌ 响应体为空`);
      return;
    }

    let chunkCount = 0;
    const decoder = new TextDecoder();

    for await (const chunk of reader as any) {
      if (chunkCount < 2) {
        const text = decoder.decode(chunk);
        console.log(`  [数据块 ${chunkCount + 1}] 内容预览:`);
        console.log(text.split('\n').map(line => `    ${line}`).join('\n'));
        chunkCount++;
      } else {
        break;
      }
    }
    console.log(`  流传输结束`);
  } catch (e: any) {
    console.log(`  ❌ 错误: ${e.message}`);
  }
}

async function main() {
  console.log('=== LLM 厂商连通性测试 ===');
  for (const p of providers) {
    await testProvider(p);
  }
  console.log('\n测试完成');
}

main();
