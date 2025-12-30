const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProvider(name, url, apiKey, model) {
  console.log(`\n=== 测试 ${name} (${model}) ===`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        stream: true,
      }),
    });

    const reader = response.body;
    let count = 0;
    
    return new Promise((resolve) => {
      reader.on('data', (chunk) => {
        if (count < 3) { // 只打印前3个数据块
          const text = chunk.toString();
          console.log(`数据块 ${count + 1}:`);
          console.log(text);
          count++;
        }
      });
      reader.on('end', () => resolve());
    });
  } catch (e) {
    console.error(`${name} 测试失败:`, e.message);
  }
}

async function run() {
  // 测试智谱
  await testProvider(
    '智谱 (Zhipu)', 
    'https://open.bigmodel.cn/api/paas/v4/chat/completions', 
    process.env.VITE_ZHIPU_API_KEY, 
    'glm-4-flash'
  );
  
  // 测试 MiniMax
  await testProvider(
    'MiniMax', 
    'https://api.minimax.chat/v1/chat/completions', 
    process.env.VITE_MINIMAX_API_KEY, 
    'MiniMax-M2.1'
  );
}

run();
