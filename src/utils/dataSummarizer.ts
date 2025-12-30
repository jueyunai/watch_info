// 数据摘要工具 - 将年度数据压缩为 LLM 可处理的格式
import type { Review, Post } from '../types';
import type { AnnualStats } from '../types/annual';

interface ReviewSummary {
  date: string;
  product: string;
  excerpt: string;  // 内容摘要（前200字）
}

interface PostSummary {
  date: string;
  title: string;
  excerpt: string;
}

interface MonthlyData {
  month: string;
  reviews: ReviewSummary[];
  posts: PostSummary[];
}

// 生成猹评摘要
function summarizeReview(review: Review): ReviewSummary {
  const content = review.content || '';
  return {
    date: review.rawUpdateAt?.split('T')[0] || '',
    product: review.productName || '未知产品',
    excerpt: content.length > 300 ? content.slice(0, 300) + '...' : content,
  };
}

// 生成讨论摘要
function summarizePost(post: Post): PostSummary {
  const content = post.content || '';
  return {
    date: post.rawUpdateAt?.split('T')[0] || '',
    title: post.title || '',
    excerpt: content.length > 300 ? content.slice(0, 300) + '...' : content,
  };
}

// 按月分组数据
function groupByMonth(reviews: Review[], posts: Post[], year: number): MonthlyData[] {
  const months: MonthlyData[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    const monthName = `${m}月`;

    const monthReviews = reviews
      .filter(r => r.rawUpdateAt?.startsWith(monthStr))
      .map(summarizeReview);

    const monthPosts = posts
      .filter(p => p.rawUpdateAt?.startsWith(monthStr))
      .map(summarizePost);

    if (monthReviews.length > 0 || monthPosts.length > 0) {
      months.push({
        month: monthName,
        reviews: monthReviews,
        posts: monthPosts,
      });
    }
  }

  return months;
}

// 生成 LLM 输入数据
export function generateLLMInput(
  nickname: string,
  stats: AnnualStats,
  reviews: Review[],
  posts: Post[],
  year: number = 2025
): string {
  const monthlyData = groupByMonth(reviews, posts, year);

  // 构建数据摘要
  const dataSummary = `
## 用户信息
- 昵称：${nickname}
- 年份：${year}

## 年度统计
- 猹评总数：${stats.totalReviews}
- 讨论总数：${stats.totalPosts}
- 涉及产品：${stats.totalProducts}
- 活跃天数：${stats.activeDays}
- 总字数：约${Math.round(stats.totalWords / 1000)}千字
- 最高产月：${stats.mostActiveMonth}月

## 月度数据详情
${monthlyData.map(m => `
### ${m.month}
${m.reviews.length > 0 ? `**猹评 (${m.reviews.length}条)**
${m.reviews.map(r => `- [${r.date}] ${r.product}: ${r.excerpt}`).join('\n')}` : ''}
${m.posts.length > 0 ? `**讨论 (${m.posts.length}条)**
${m.posts.map(p => `- [${p.date}] ${p.title}: ${p.excerpt}`).join('\n')}` : ''}
`).join('\n')}
`.trim();

  return dataSummary;
}

// 年报提示词
export const ANNUAL_SYSTEM_PROMPT = `你是「年度认知审计师」，擅长从一整年的碎片化输出中提炼思维演进的脉络。

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
- 所有引号必须使用中文双引号“”，禁止使用英文引号
- 禁止使用破折号（——），用逗号或句号代替`;

export const ANNUAL_USER_PROMPT = (data: string) => `请基于以下数据生成年度洞察报告：

${data}`;
