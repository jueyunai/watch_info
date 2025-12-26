// 年度报告相关类型

export interface AnnualStats {
    // 基础统计
    totalReviews: number;
    totalPosts: number;
    totalProducts: number;
    activeDays: number;
    totalWords: number;
    avgWordsPerReview: number;

    // 时间分布
    monthlyReviews: number[];  // 12个月的猹评数
    monthlyPosts: number[];    // 12个月的讨论数
    mostActiveMonth: number;   // 最高产月份 (1-12)
    leastActiveMonth: number;  // 最低产月份 (1-12)

    // 第一条和最后一条
    firstReviewDate: string | null;
    lastReviewDate: string | null;

    // 产品相关
    productNames: string[];
    productReviewCounts: Record<string, number>;
}

export interface AchievementLabel {
    emoji: string;
    title: string;
    description: string;
}

export interface AnnualReportData {
    username: string;
    nickname: string;
    stats: AnnualStats;
    labels: AchievementLabel[];
    generatedAt: Date;
}
