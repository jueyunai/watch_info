const API_KEY = process.env.VITE_ZHIPU_API_KEY;
const BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

async function test() {
  console.log('--- 开始测试 GLM-4.7 响应速度 ---');
  const start = Date.now();
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash', // 我们先测 Flash 版作为对比
        messages: [{ role: 'user', content: '你好' }],
        stream: true,
      }),
    });

    const reader = response.body.getReader();
    const { value } = await reader.read();
    const ttfb = (Date.now() - start) / 1000;
    console.log(`GLM-4-Flash 首字延迟: ${ttfb}s`);
  } catch (e) {
    console.error('测试失败:', e.message);
  }
}
test();
