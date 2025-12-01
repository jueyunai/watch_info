// API 响应类型
export interface UserInfo {
  id: number;
  nickname: string;
  username: string;
  review_count: number;
}

export interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  marks?: { type: string }[];
}

export interface ReviewItem {
  id: number;
  product: {
    name: string;
  };
  content: ContentNode;
  update_at: string;
}

export interface ReviewsResponse {
  total: number;
  skip: number;
  limit: number;
  count: number;
  items: ReviewItem[];
}

// 应用数据类型
export interface Review {
  id: number;
  productName: string;
  updateAt: Date;
  content: string;
  rawUpdateAt: string;
}

export interface FilterOptions {
  startDate?: Date;
  endDate?: Date;
  month?: { year: number; month: number };
}

export interface MonthOption {
  label: string;
  year: number;
  month: number;
  start: Date;
  end: Date;
}

// URL 解析结果
export interface ParseResult {
  success: boolean;
  username?: string;
  error?: string;
}

// 导出格式
export interface FormattedReview {
  productName: string;
  updateTime: string;
  content: string;
}
