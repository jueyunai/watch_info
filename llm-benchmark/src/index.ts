#!/usr/bin/env node
// LLM 性能基准测试入口
import { type Provider, ALL_PROVIDERS, getValidProviders } from './config.js';
import { fetchUserData, loadCachedData, cacheData } from './data-fetcher.js';
import { runAllTests } from './test-engine.js';
import { 
  saveProviderResponse, 
  generateReport, 
  saveJsonReport, 
  printFullReport 
} from './report.js';

const DEFAULT_USERNAME = 'zhiyun';

// 解析命令行参数
function parseArgs(): { providers: Provider[]; username: string; noCache: boolean } {
  const args = process.argv.slice(2);
  let providers: Provider[] = [];
  let username = DEFAULT_USERNAME;
  let noCache = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--provider' || arg === '-p') {
      const value = args[++i];
      if (value) {
        const requested = value.split(',').map(p => p.trim()) as Provider[];
        providers = requested.filter(p => ALL_PROVIDERS.includes(p));
      }
    } else if (arg === '--username' || arg === '-u') {
      username = args[++i] || DEFAULT_USERNAME;
    } else if (arg === '--no-cache') {
      noCache = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  // 如果没有指定厂商，使用所有有效配置的厂商
  if (providers.length === 0) {
    providers = getValidProviders();
  }

  return { providers, username, noCache };
}

// 打印帮助信息
function printHelp(): void {
  console.log(`
LLM 性能基准测试工具

用法:
  npm start [选项]

选项:
  -p, --provider <providers>  指定测试厂商，多个用逗号分隔
                              可选: minimax, zhipu, deepseek, kimi
  -u, --username <username>   指定观猹用户名 (默认: zhiyun)
  --no-cache                  不使用缓存数据，强制重新获取
  -h, --help                  显示帮助信息

示例:
  npm start                           # 测试所有配置的厂商
  npm start -p minimax,zhipu          # 只测试 MiniMax 和智谱
  npm start -u zhiyun --no-cache      # 强制重新获取数据
`);
}

// 主函数
async function main(): Promise<void> {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      LLM 性能基准测试工具 v1.0                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝');

  const { providers, username, noCache } = parseArgs();

  if (providers.length === 0) {
    console.error('\n[错误] 没有找到有效的厂商配置，请检查 .env 文件');
    process.exit(1);
  }

  console.log(`\n[配置] 测试厂商: ${providers.join(', ')}`);
  console.log(`[配置] 目标用户: ${username}`);

  // 获取数据
  let userData = noCache ? null : loadCachedData();
  
  if (!userData || userData.username !== username) {
    console.log('\n[数据] 从 API 获取数据...');
    try {
      userData = await fetchUserData(username);
      cacheData(userData);
    } catch (error) {
      console.error(`\n[错误] 数据获取失败: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  console.log(`\n[数据] 用户: ${userData.nickname} (@${userData.username})`);
  console.log(`[数据] 猹评: ${userData.reviews.length} 条, 讨论: ${userData.posts.length} 条`);

  // 执行测试
  const results = await runAllTests(userData, providers);

  // 保存各厂商响应
  for (const result of results) {
    saveProviderResponse(result);
  }

  // 生成并保存报告
  const report = generateReport(results, userData);
  saveJsonReport(report);

  // 打印报告
  printFullReport(report);

  // 统计结果
  const successCount = results.filter(r => r.success).length;
  console.log(`\n[完成] 测试完成: ${successCount}/${results.length} 成功`);
}

// 运行
main().catch(error => {
  console.error('\n[错误] 程序异常:', error);
  process.exit(1);
});
