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
        messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
        max_tokens: 50,
      }),
    });

    const elapsed = Date.now() - start;
    
    if (!res.ok) {
      const err = await res.text();
      console.log(`  ❌ HTTP ${res.status}: ${err.slice(0, 200)}`);
      return;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '(无内容)';
    console.log(`  ✅ 成功 (${elapsed}ms): ${content.slice(0, 50)}`);
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
