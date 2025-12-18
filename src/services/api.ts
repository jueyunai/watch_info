import type { UserInfo, ReviewItem, ReviewsResponse, PostItem, PostsResponse } from '../types';

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
  // API的total字段可能返回0，不再依赖它判断分页结束
  // 改用 items.length < PAGE_SIZE 作为主要判断条件
  const MAX_PAGES = 100; // 安全限制，防止无限循环
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    console.log(`Fetching reviews: skip=${skip}, limit=${PAGE_SIZE}, page=${pageCount + 1}`);
    const response = await fetchReviews(userId, skip, PAGE_SIZE);

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
      // 由于total不可靠，使用已加载数量作为进度指示
      onProgress(allReviews.length, response.total > 0 ? response.total : allReviews.length);
    }

    // 如果返回的数量小于请求的数量，说明已经没有更多数据
    if (response.items.length < PAGE_SIZE) {
      console.log(`Received ${response.items.length} < ${PAGE_SIZE}, last page reached`);
      break;
    }

    skip += PAGE_SIZE;
    pageCount++;
  }

  if (pageCount >= MAX_PAGES) {
    console.warn('Max pages limit reached');
  }

  console.log(`Final count: ${allReviews.length} reviews`);
  return allReviews;
}

// 获取讨论数据
export async function fetchPosts(
  userId: number,
  skip: number = 0,
  limit: number = PAGE_SIZE
): Promise<PostsResponse> {
  const path = `users/${userId}/posts?_user_id=${userId}&skip=${skip}&limit=${limit}`;
  
  const url = import.meta.env.DEV 
    ? `${BASE_URL}/${path}`
    : `${BASE_URL}${encodeURIComponent(path)}`;
  
  console.log(`Fetching posts URL: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(`获取讨论数据失败: ${response.status}`, response.status);
  }

  const data = await response.json();
  const postsData = data.data || data;
  
  if (!postsData || !Array.isArray(postsData.items)) {
    console.error('Invalid response structure:', data);
    throw new ApiError('响应数据格式错误');
  }
  
  return postsData as PostsResponse;
}

export async function fetchAllPosts(
  userId: number,
  onProgress?: (loaded: number, total: number) => void
): Promise<PostItem[]> {
  const allPosts: PostItem[] = [];
  const seenIds = new Set<number>();
  let skip = 0;
  const MAX_PAGES = 100;
  let pageCount = 0;

  while (pageCount < MAX_PAGES) {
    console.log(`Fetching posts: skip=${skip}, limit=${PAGE_SIZE}, page=${pageCount + 1}`);
    const response = await fetchPosts(userId, skip, PAGE_SIZE);

    if (!response.items || response.items.length === 0) {
      console.log('No more posts, breaking');
      break;
    }

    console.log(`Received ${response.items.length} posts`);

    let addedCount = 0;
    for (const item of response.items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allPosts.push(item);
        addedCount++;
      } else {
        console.warn(`Duplicate post found: ${item.id}`);
      }
    }
    
    console.log(`Added ${addedCount} new posts, total now: ${allPosts.length}`);
    
    if (onProgress) {
      onProgress(allPosts.length, response.total > 0 ? response.total : allPosts.length);
    }

    if (response.items.length < PAGE_SIZE) {
      console.log(`Received ${response.items.length} < ${PAGE_SIZE}, last page reached`);
      break;
    }

    skip += PAGE_SIZE;
    pageCount++;
  }

  if (pageCount >= MAX_PAGES) {
    console.warn('Max pages limit reached');
  }

  console.log(`Final count: ${allPosts.length} posts`);
  return allPosts;
}

// 用于测试的分页逻辑判断函数
export function shouldContinuePaging(itemsCount: number, limit: number): boolean {
  return itemsCount >= limit;
}
