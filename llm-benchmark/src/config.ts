// 配置加载模块
import { config } from 'dotenv';
import { resolve } from 'path';

// 加载主项目的 .env 文件
config({ path: resolve(process.cwd(), '../.env') });

export type Provider = 'minimax' | 'zhipu' | 'deepseek' | 'kimi' | 'ms-deepseek' | 'ms-glm' | 'ms-qwen';

export interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

// 所有支持的厂商
export const ALL_PROVIDERS: Provider[] = ['minimax', 'zhipu', 'deepseek', 'kimi', 'ms-deepseek', 'ms-glm', 'ms-qwen'];

// 获取厂商配置
export function getProviderConfig(provider: Provider): ProviderConfig {
  const configs: Record<Provider, ProviderConfig> = {
    minimax: {
      provider: 'minimax',
      apiKey: process.env.VITE_MINIMAX_API_KEY || '',
      baseUrl: process.env.VITE_MINIMAX_BASE_URL || 'https://api.minimax.chat/v1',
      model: process.env.VITE_MINIMAX_MODEL || 'MiniMax-M2.1',
    },
    zhipu: {
      provider: 'zhipu',
      apiKey: process.env.VITE_ZHIPU_API_KEY || '',
      baseUrl: process.env.VITE_ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
      model: process.env.VITE_ZHIPU_MODEL || 'glm-4-flash',
    },
    deepseek: {
      provider: 'deepseek',
      apiKey: process.env.VITE_DEEPSEEK_API_KEY || '',
      baseUrl: process.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat',
    },
    kimi: {
      provider: 'kimi',
      apiKey: process.env.VITE_KIMI_API_KEY || '',
      baseUrl: process.env.VITE_KIMI_BASE_URL || 'https://api.moonshot.cn/v1',
      model: process.env.VITE_KIMI_MODEL || 'moonshot-v1-8k',
    },
    'ms-deepseek': {
      provider: 'ms-deepseek',
      apiKey: process.env.VITE_MS_DEEPSEEK_API_KEY || '',
      baseUrl: process.env.VITE_MS_DEEPSEEK_BASE_URL || 'https://api-inference.modelscope.cn/v1',
      model: process.env.VITE_MS_DEEPSEEK_MODEL || 'deepseek-ai/DeepSeek-R1-0528',
    },
    'ms-glm': {
      provider: 'ms-glm',
      apiKey: process.env.VITE_MS_GLM_API_KEY || '',
      baseUrl: process.env.VITE_MS_GLM_BASE_URL || 'https://api-inference.modelscope.cn/v1',
      model: process.env.VITE_MS_GLM_MODEL || 'ZhipuAI/GLM-4.7',
    },
    'ms-qwen': {
      provider: 'ms-qwen',
      apiKey: process.env.VITE_MS_QWEN_API_KEY || '',
      baseUrl: process.env.VITE_MS_QWEN_BASE_URL || 'https://api-inference.modelscope.cn/v1',
      model: process.env.VITE_MS_QWEN_MODEL || 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    },
  };

  return configs[provider];
}

// 验证配置是否有效
export function validateConfig(config: ProviderConfig): boolean {
  return !!(config.apiKey && config.baseUrl && config.model);
}

// 获取所有有效配置的厂商
export function getValidProviders(): Provider[] {
  return ALL_PROVIDERS.filter(p => validateConfig(getProviderConfig(p)));
}

// 系统提示词（复用主项目）
export const SYSTEM_PROMPT = `你是「年度认知审计师」，擅长从一整年的碎片化输出中提炼思维演进的脉络。

## 输出要求
请生成一份精炼的年度洞察报告，包含以下板块（每个板块2-3句话即可）：

### 🔥 年度关注力图谱
- 高频关键词和核心关注领域
- 整体情绪基调

### 🧠 认知演进轨迹  
- 1-2个贯穿全年的核心母题
- 观点变化的关键节点（如有）

### ✨ 年度金句
- 摘录1-2句最有洞察力的原创观点

### 🕵️ 盲区提醒
- 1个值得注意的思维定势或盲区

### 🚀 2026建议
- 1个值得深挖的方向
- 1个直击舒适区的问题

## 风格要求
- 简洁有力，拒绝流水账
- 有洞察深度，不是数据复述
- 语言稍带仪式感，这是年度报告
- 所有引号必须使用中文双引号""，禁止使用英文引号
- 禁止使用破折号（——），用逗号或句号代替`;

export const USER_PROMPT = (data: string) => `请基于以下数据生成年度洞察报告：

${data}`;
