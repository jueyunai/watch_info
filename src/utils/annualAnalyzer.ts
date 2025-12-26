import type { Review, Post } from '../types';
import type { AnnualStats, AchievementLabel } from '../types/annual';

/**
 * 分析年度数据，生成统计信息
 */
export function analyzeAnnualData(
    reviews: Review[],
    posts: Post[],
    year: number = 2025
): AnnualStats {
    // 筛选指定年份的数据
    const yearReviews = reviews.filter(r => r.updateAt.getFullYear() === year);
    const yearPosts = posts.filter(p => p.updateAt.getFullYear() === year);

    // 月度分布统计 (索引0=1月, 索引11=12月)
    const monthlyReviews = new Array(12).fill(0);
    const monthlyPosts = new Array(12).fill(0);

    yearReviews.forEach(r => {
        const month = r.updateAt.getMonth();
        monthlyReviews[month]++;
    });

    yearPosts.forEach(p => {
        const month = p.updateAt.getMonth();
        monthlyPosts[month]++;
    });

    // 计算活跃天数
    const activeDaysSet = new Set<string>();
    yearReviews.forEach(r => {
        activeDaysSet.add(r.updateAt.toISOString().split('T')[0]);
    });
    yearPosts.forEach(p => {
        activeDaysSet.add(p.updateAt.toISOString().split('T')[0]);
    });

    // 计算总字数
    const totalWords = yearReviews.reduce((sum, r) => sum + r.content.length, 0) +
        yearPosts.reduce((sum, p) => sum + p.content.length, 0);

    // 统计产品
    const productReviewCounts: Record<string, number> = {};
    yearReviews.forEach(r => {
        productReviewCounts[r.productName] = (productReviewCounts[r.productName] || 0) + 1;
    });

    // 找出最高产和最低产月份
    const monthlyTotal = monthlyReviews.map((r, i) => r + monthlyPosts[i]);
    let mostActiveMonth = 1;
    let leastActiveMonth = 1;
    let maxOutput = monthlyTotal[0];
    let minOutput = monthlyTotal[0];

    monthlyTotal.forEach((total, index) => {
        if (total > maxOutput) {
            maxOutput = total;
            mostActiveMonth = index + 1;
        }
        if (total < minOutput) {
            minOutput = total;
            leastActiveMonth = index + 1;
        }
    });

    // 获取第一条和最后一条猹评日期
    const sortedReviews = [...yearReviews].sort((a, b) => a.updateAt.getTime() - b.updateAt.getTime());

    return {
        totalReviews: yearReviews.length,
        totalPosts: yearPosts.length,
        totalProducts: Object.keys(productReviewCounts).length,
        activeDays: activeDaysSet.size,
        totalWords,
        avgWordsPerReview: yearReviews.length > 0 ? Math.round(totalWords / yearReviews.length) : 0,
        monthlyReviews,
        monthlyPosts,
        mostActiveMonth,
        leastActiveMonth,
        firstReviewDate: sortedReviews.length > 0 ? sortedReviews[0].rawUpdateAt : null,
        lastReviewDate: sortedReviews.length > 0 ? sortedReviews[sortedReviews.length - 1].rawUpdateAt : null,
        productNames: Object.keys(productReviewCounts),
        productReviewCounts,
    };
}

/**
 * 根据统计数据生成成就标签
 */
export function generateLabels(stats: AnnualStats): AchievementLabel[] {
    const labels: AchievementLabel[] = [];

    // 高产观猹员
    if (stats.totalReviews >= 100) {
        labels.push({
            emoji: '🏆',
            title: '年度高产观猹员',
            description: `全年输出 ${stats.totalReviews} 条猹评`
        });
    } else if (stats.totalReviews >= 50) {
        labels.push({
            emoji: '⭐',
            title: '活跃观猹员',
            description: `全年输出 ${stats.totalReviews} 条猹评`
        });
    }

    // 深度测评家
    if (stats.avgWordsPerReview >= 500) {
        labels.push({
            emoji: '📚',
            title: '深度测评家',
            description: `平均每条猹评 ${stats.avgWordsPerReview} 字`
        });
    }

    // AI产品探索者
    if (stats.totalProducts >= 50) {
        labels.push({
            emoji: '🔭',
            title: 'AI产品探索者',
            description: `涉猎 ${stats.totalProducts} 款产品`
        });
    } else if (stats.totalProducts >= 20) {
        labels.push({
            emoji: '🎯',
            title: '产品体验官',
            description: `涉猎 ${stats.totalProducts} 款产品`
        });
    }

    // 每日观猹达人
    if (stats.activeDays >= 200) {
        labels.push({
            emoji: '⚡',
            title: '每日观猹达人',
            description: `活跃 ${stats.activeDays} 天`
        });
    } else if (stats.activeDays >= 100) {
        labels.push({
            emoji: '🔥',
            title: '持续输出者',
            description: `活跃 ${stats.activeDays} 天`
        });
    }

    // 精品主义者
    if (stats.totalReviews <= 10 && stats.avgWordsPerReview >= 800) {
        labels.push({
            emoji: '💎',
            title: '精品主义者',
            description: '质量胜于数量'
        });
    }

    // 如果没有任何标签，给一个默认标签
    if (labels.length === 0) {
        labels.push({
            emoji: '🦔',
            title: '观猹新人',
            description: '2025年的观猹之旅已开启'
        });
    }

    return labels;
}

/**
 * 格式化字数显示
 */
export function formatWordCount(count: number): string {
    if (count >= 10000) {
        return (count / 10000).toFixed(1) + ' 万字';
    }
    return count.toLocaleString() + ' 字';
}

/**
 * 获取月份中文名
 */
export function getMonthName(month: number): string {
    const names = ['一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return names[month - 1] || '';
}
