import type { UserInfo, ReviewItem, ReviewsResponse } from '../types';

// 开发环境使用代理，生产环境直接请求
const BASE_URL = import.meta.env.DEV ? '/api/v2' : 'https://watcha.cn/api/v2';
const PAGE_SIZE = 20;

export class ApiError extends Error {
  statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export async function fetchUserInfo(username: string): Promise<UserInfo> {
  const response = await fetch(`${BASE_URL}/users/${username}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new ApiError(`用户 "${username}" 不存在`, 404);
    }
    throw new ApiError(`获取用户信息失败: ${response.status}`, response.status);
  }

  const data = await response.json();
  return data.data as UserInfo;
}

export async function fetchReviews(
  userId: number,
  skip: number = 0,
  limit: number = PAGE_SIZE
): Promise<ReviewsResponse> {
  const url = `${BASE_URL}/users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${limit}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(`获取猹评数据失败: ${response.status}`, response.status);
  }

  const data = await response.json();
  return data.data as ReviewsResponse;
}

export async function fetchAllReviews(
  userId: number,
  onProgress?: (loaded: number, total: number) => void
): Promise<ReviewItem[]> {
  const allReviews: ReviewItem[] = [];
  let skip = 0;
  let total = 0;

  while (true) {
    const response = await fetchReviews(userId, skip, PAGE_SIZE);
    
    if (total === 0) {
      total = response.total;
    }

    allReviews.push(...response.items);
    
    if (onProgress) {
      onProgress(allReviews.length, total);
    }

    // 如果返回的数量小于请求的数量，说明已经没有更多数据
    if (response.items.length < PAGE_SIZE) {
      break;
    }

    skip += PAGE_SIZE;
  }

  return allReviews;
}

// 用于测试的分页逻辑判断函数
export function shouldContinuePaging(itemsCount: number, limit: number): boolean {
  return itemsCount >= limit;
}
