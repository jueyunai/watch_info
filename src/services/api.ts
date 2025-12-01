import type { UserInfo, ReviewItem, ReviewsResponse } from '../types';

// 开发环境使用Vite代理，生产环境使用Vercel API代理
const BASE_URL = import.meta.env.DEV ? '/api/v2' : '/api/proxy?path=';
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
  const path = `users/${username}`;
  const url = import.meta.env.DEV 
    ? `${BASE_URL}/${path}`
    : `${BASE_URL}${encodeURIComponent(path)}`;
  
  const response = await fetch(url, {
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
  const path = `users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${limit}`;
  
  // 生产环境需要对path进行URL编码，因为它包含查询参数
  const url = import.meta.env.DEV 
    ? `${BASE_URL}/${path}`
    : `${BASE_URL}${encodeURIComponent(path)}`;
  
  console.log(`Fetching URL: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(`获取猹评数据失败: ${response.status}`, response.status);
  }

  const data = await response.json();
  
  // 生产环境的API代理已经返回了完整的响应，需要提取data字段
  const reviewsData = data.data || data;
  
  if (!reviewsData || !Array.isArray(reviewsData.items)) {
    console.error('Invalid response structure:', data);
    throw new ApiError('响应数据格式错误');
  }
  
  return reviewsData as ReviewsResponse;
}

export async function fetchAllReviews(
  userId: number,
  onProgress?: (loaded: number, total: number) => void
): Promise<ReviewItem[]> {
  const allReviews: ReviewItem[] = [];
  const seenIds = new Set<number>();
  let skip = 0;
  let total = 0;

  while (true) {
    console.log(`Fetching reviews: skip=${skip}, limit=${PAGE_SIZE}`);
    const response = await fetchReviews(userId, skip, PAGE_SIZE);
    
    if (total === 0) {
      total = response.total;
      console.log(`Total reviews: ${total}`);
    }

    // 如果没有返回任何数据，退出循环
    if (!response.items || response.items.length === 0) {
      console.log('No more items, breaking');
      break;
    }

    console.log(`Received ${response.items.length} items`);

    // 去重：只添加未见过的猹评
    let addedCount = 0;
    for (const item of response.items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allReviews.push(item);
        addedCount++;
      } else {
        console.warn(`Duplicate review found: ${item.id}`);
      }
    }
    
    console.log(`Added ${addedCount} new items, total now: ${allReviews.length}`);
    
    if (onProgress) {
      onProgress(allReviews.length, total);
    }

    // 如果返回的数量小于请求的数量，说明已经没有更多数据
    if (response.items.length < PAGE_SIZE) {
      console.log(`Received ${response.items.length} < ${PAGE_SIZE}, last page reached`);
      break;
    }

    // 如果已经获取了所有数据，退出循环
    if (allReviews.length >= total) {
      console.log(`Collected ${allReviews.length} >= ${total}, all data fetched`);
      break;
    }

    skip += PAGE_SIZE;
    
    // 安全检查：防止无限循环
    if (skip > total + PAGE_SIZE) {
      console.warn('Pagination safety check triggered');
      break;
    }
  }

  console.log(`Final count: ${allReviews.length} reviews`);
  return allReviews;
}

// 用于测试的分页逻辑判断函数
export function shouldContinuePaging(itemsCount: number, limit: number): boolean {
  return itemsCount >= limit;
}
