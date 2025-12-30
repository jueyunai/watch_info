// 测试引擎
import { type Provider, ALL_PROVIDERS, SYSTEM_PROMPT, USER_PROMPT, getProviderConfig } from './config.js';
import { chat, type ChatResult, type PerformanceMetrics, type Message } from './llm-client.js';
import { type UserData, generateLLMInput } from './data-fetcher.js';

export interface TestResult {
  provider: Provider;
  model: string;
  success: boolean;
  error?: string;
  metrics?: PerformanceMetrics;
  content?: string;
  reasoningContent?: string;
  reasoningFormat: 'field' | 'tag' | 'none';
  testedAt: string;
}

// 执行单个厂商测试
export async function runTest(provider: Provider, data: UserData): Promise<TestResult> {
  const config = getProviderConfig(provider);
  const testedAt = new Date().toISOString();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[测试] 开始测试: ${provider} / ${config.model}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const llmInput = generateLLMInput(data);
    const messages: Message[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: USER_PROMPT(llmInput) },
    ];

    const result = await chat(provider, messages, { maxTokens: 4096 });

    console.log(`[测试] ✅ ${provider} 测试成功`);
    console.log(`[测试] TTFT: ${result.metrics.ttft}ms, 总耗时: ${result.metrics.totalTime}ms`);
    console.log(`[测试] TPS: ${result.metrics.tps}, Tokens: ${result.metrics.totalTokens}`);
    console.log(`[测试] 推理格式: ${result.reasoningFormat}`);

    return {
      provider,
      model: result.model,
      success: true,
      metrics: result.metrics,
      content: result.content,
      reasoningContent: result.reasoningContent,
      reasoningFormat: result.reasoningFormat,
      testedAt,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[测试] ❌ ${provider} 测试失败: ${errorMsg}`);

    return {
      provider,
      model: config.model,
      success: false,
      error: errorMsg,
      reasoningFormat: 'none',
      testedAt,
    };
  }
}

// 执行所有厂商测试
export async function runAllTests(
  data: UserData,
  providers: Provider[] = ALL_PROVIDERS
): Promise<TestResult[]> {
  const results: TestResult[] = [];

  console.log(`\n[测试] 开始测试 ${providers.length} 个厂商...`);
  console.log(`[测试] 厂商列表: ${providers.join(', ')}`);

  for (const provider of providers) {
    const result = await runTest(provider, data);
    results.push(result);
    
    // 每个测试之间稍作间隔
    if (provider !== providers[providers.length - 1]) {
      console.log(`\n[测试] 等待 2 秒后继续下一个测试...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// 生成测试消息（用于验证输入一致性）
export function generateTestMessages(data: UserData): Message[] {
  const llmInput = generateLLMInput(data);
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: USER_PROMPT(llmInput) },
  ];
}
