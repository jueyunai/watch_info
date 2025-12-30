// 报告生成模块
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { type TestResult } from './test-engine.js';
import { type UserData } from './data-fetcher.js';

const REPORTS_DIR = resolve(process.cwd(), 'reports');
const RESPONSES_DIR = resolve(process.cwd(), 'data/responses');

export interface BenchmarkReport {
  testId: string;
  testedAt: string;
  dataSource: {
    username: string;
    reviewCount: number;
    postCount: number;
  };
  results: TestResult[];
  summary: {
    fastestTTFT?: { provider: string; value: number };
    fastestTotal?: { provider: string; value: number };
    highestTPS?: { provider: string; value: number };
  };
}

// 确保目录存在
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// 生成测试 ID
function generateTestId(): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `benchmark-${timestamp}`;
}

// 保存单个厂商的响应
export function saveProviderResponse(result: TestResult): void {
  ensureDir(RESPONSES_DIR);
  
  const filename = `${result.provider}.json`;
  const filepath = resolve(RESPONSES_DIR, filename);
  
  const data = {
    provider: result.provider,
    model: result.model,
    testedAt: result.testedAt,
    success: result.success,
    error: result.error,
    reasoningFormat: result.reasoningFormat,
    content: result.content,
    reasoningContent: result.reasoningContent,
    metrics: result.metrics,
  };

  writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[报告] 响应已保存: ${filepath}`);
}

// 生成汇总报告
export function generateReport(results: TestResult[], userData: UserData): BenchmarkReport {
  const successResults = results.filter(r => r.success && r.metrics);
  
  // 计算最优指标
  let fastestTTFT: { provider: string; value: number } | undefined;
  let fastestTotal: { provider: string; value: number } | undefined;
  let highestTPS: { provider: string; value: number } | undefined;

  for (const result of successResults) {
    const metrics = result.metrics!;
    
    if (!fastestTTFT || metrics.ttft < fastestTTFT.value) {
      fastestTTFT = { provider: result.provider, value: metrics.ttft };
    }
    if (!fastestTotal || metrics.totalTime < fastestTotal.value) {
      fastestTotal = { provider: result.provider, value: metrics.totalTime };
    }
    if (!highestTPS || metrics.tps > highestTPS.value) {
      highestTPS = { provider: result.provider, value: metrics.tps };
    }
  }

  return {
    testId: generateTestId(),
    testedAt: new Date().toISOString(),
    dataSource: {
      username: userData.username,
      reviewCount: userData.reviews.length,
      postCount: userData.posts.length,
    },
    results,
    summary: {
      fastestTTFT,
      fastestTotal,
      highestTPS,
    },
  };
}

// 保存 JSON 报告
export function saveJsonReport(report: BenchmarkReport): string {
  ensureDir(REPORTS_DIR);
  
  const filename = `${report.testId}.json`;
  const filepath = resolve(REPORTS_DIR, filename);
  
  writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`[报告] 汇总报告已保存: ${filepath}`);
  
  return filepath;
}

// 打印控制台报告
export function printConsoleReport(results: TestResult[]): void {
  console.log('\n');
  console.log('═'.repeat(80));
  console.log('                         LLM 性能基准测试报告');
  console.log('═'.repeat(80));
  
  // 表头
  console.log('\n┌────────────┬─────────────────────┬──────────┬──────────┬──────────┬────────────┐');
  console.log('│ 厂商       │ 模型                │ TTFT(ms) │ 总耗时   │ TPS      │ Tokens     │');
  console.log('├────────────┼─────────────────────┼──────────┼──────────┼──────────┼────────────┤');

  for (const result of results) {
    if (result.success && result.metrics) {
      const m = result.metrics;
      const provider = result.provider.padEnd(10);
      const model = result.model.slice(0, 19).padEnd(19);
      const ttft = String(m.ttft).padStart(8);
      const total = formatTime(m.totalTime).padStart(8);
      const tps = String(m.tps).padStart(8);
      const tokens = String(m.totalTokens).padStart(10);
      
      console.log(`│ ${provider} │ ${model} │ ${ttft} │ ${total} │ ${tps} │ ${tokens} │`);
    } else {
      const provider = result.provider.padEnd(10);
      const model = result.model.slice(0, 19).padEnd(19);
      const error = '失败'.padStart(8);
      
      console.log(`│ ${provider} │ ${model} │ ${error} │ ${error} │ ${error} │ ${error.padStart(10)} │`);
    }
  }

  console.log('└────────────┴─────────────────────┴──────────┴──────────┴──────────┴────────────┘');
}

// 打印兼容性报告
export function printCompatibilityReport(results: TestResult[]): void {
  console.log('\n');
  console.log('─'.repeat(80));
  console.log('                         推理内容格式兼容性');
  console.log('─'.repeat(80));
  
  console.log('\n┌────────────┬─────────────────────┬────────────────┬────────────────────────┐');
  console.log('│ 厂商       │ 模型                │ 推理格式       │ 说明                   │');
  console.log('├────────────┼─────────────────────┼────────────────┼────────────────────────┤');

  for (const result of results) {
    const provider = result.provider.padEnd(10);
    const model = result.model.slice(0, 19).padEnd(19);
    
    let format = '';
    let desc = '';
    
    switch (result.reasoningFormat) {
      case 'field':
        format = 'reasoning_content';
        desc = '使用独立字段返回';
        break;
      case 'tag':
        format = '<think> 标签';
        desc = '内嵌在 content 中';
        break;
      case 'none':
        format = '无推理内容';
        desc = result.success ? '直接返回结果' : '测试失败';
        break;
    }
    
    console.log(`│ ${provider} │ ${model} │ ${format.padEnd(14)} │ ${desc.padEnd(22)} │`);
  }

  console.log('└────────────┴─────────────────────┴────────────────┴────────────────────────┘');
}

// 格式化时间
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

// 打印完整报告
export function printFullReport(report: BenchmarkReport): void {
  printConsoleReport(report.results);
  printCompatibilityReport(report.results);
  
  console.log('\n');
  console.log('─'.repeat(80));
  console.log('                              性能排名');
  console.log('─'.repeat(80));
  
  if (report.summary.fastestTTFT) {
    console.log(`  🥇 最快首 Token: ${report.summary.fastestTTFT.provider} (${report.summary.fastestTTFT.value}ms)`);
  }
  if (report.summary.fastestTotal) {
    console.log(`  🥇 最快总响应: ${report.summary.fastestTotal.provider} (${formatTime(report.summary.fastestTotal.value)})`);
  }
  if (report.summary.highestTPS) {
    console.log(`  🥇 最高 TPS: ${report.summary.highestTPS.provider} (${report.summary.highestTPS.value} tokens/s)`);
  }
  
  console.log('\n' + '═'.repeat(80));
}
