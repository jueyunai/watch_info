// 数据获取模块
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const API_BASE = 'https://watcha.cn/api/v2';
const PAGE_SIZE = 20;
const CACHE_FILE = resolve(process.cwd(), 'data/cached-data.json');

export interface ReviewItem {
  id: number;
  content: any;  // 富文本对象
  update_at: string;
  product?: {
    name: string;
  };
}

export interface PostItem {
  id: number;
  title: string;
  content: any;  // 富文本对象
  update_at: string;
}

export interface UserInfo {
  id: number;
  username: string;
  nickname: string;
}

export interface UserData {
  username: string;
  nickname: string;
  userId: number;
  reviews: ReviewItem[];
  posts: PostItem[];
  fetchedAt: string;
}

// 获取用户信息
async function fetchUserInfo(username: string): Promise<UserInfo> {
  const url = `${API_BASE}/users/${username}`;
  console.log(`[数据] 获取用户信息: ${url}`);
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`获取用户信息失败: ${response.status}`);
  }

  const data = await response.json();
  return data.data as UserInfo;
}

// 获取猹评列表
async function fetchReviews(userId: number): Promise<ReviewItem[]> {
  const allReviews: ReviewItem[] = [];
  const seenIds = new Set<number>();
  let skip = 0;

  while (true) {
    const url = `${API_BASE}/users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${PAGE_SIZE}`;
    console.log(`[数据] 获取猹评: skip=${skip}`);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`获取猹评失败: ${response.status}`);
    }

    const data = await response.json();
    const items = (data.data?.items || []) as ReviewItem[];

    if (items.length === 0) break;

    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allReviews.push(item);
      }
    }

    if (items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  console.log(`[数据] 共获取 ${allReviews.length} 条猹评`);
  return allReviews;
}

// 获取讨论列表
async function fetchPosts(userId: number): Promise<PostItem[]> {
  const allPosts: PostItem[] = [];
  const seenIds = new Set<number>();
  let skip = 0;

  while (true) {
    const url = `${API_BASE}/users/${userId}/posts?_user_id=${userId}&skip=${skip}&limit=${PAGE_SIZE}`;
    console.log(`[数据] 获取讨论: skip=${skip}`);
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`获取讨论失败: ${response.status}`);
    }

    const data = await response.json();
    const items = (data.data?.items || []) as PostItem[];

    if (items.length === 0) break;

    for (const item of items) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        allPosts.push(item);
      }
    }

    if (items.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  console.log(`[数据] 共获取 ${allPosts.length} 条讨论`);
  return allPosts;
}

// 从 API 获取用户数据
export async function fetchUserData(username: string): Promise<UserData> {
  console.log(`[数据] 开始获取用户 ${username} 的数据...`);
  
  const userInfo = await fetchUserInfo(username);
  const reviews = await fetchReviews(userInfo.id);
  const posts = await fetchPosts(userInfo.id);

  return {
    username: userInfo.username,
    nickname: userInfo.nickname,
    userId: userInfo.id,
    reviews,
    posts,
    fetchedAt: new Date().toISOString(),
  };
}

// 加载缓存数据
export function loadCachedData(): UserData | null {
  if (!existsSync(CACHE_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(CACHE_FILE, 'utf-8');
    const data = JSON.parse(content) as UserData;
    console.log(`[缓存] 加载缓存数据: ${data.username}, ${data.reviews.length} 条猹评, ${data.posts.length} 条讨论`);
    return data;
  } catch (error) {
    console.error('[缓存] 加载失败:', error);
    return null;
  }
}

// 保存缓存数据
export function cacheData(data: UserData): void {
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[缓存] 数据已保存到 ${CACHE_FILE}`);
  } catch (error) {
    console.error('[缓存] 保存失败:', error);
  }
}

// 从富文本对象中提取纯文本
function extractTextFromContent(content: any): string {
  if (typeof content === 'string') return content;
  if (!content || !content.content) return '';
  
  const texts: string[] = [];
  
  function traverse(node: any) {
    if (node.text) {
      texts.push(node.text);
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }
  
  traverse(content);
  return texts.join('');
}

// 生成 LLM 输入数据（简化版）
export function generateLLMInput(data: UserData): string {
  const year = 2025;
  const yearReviews = data.reviews.filter(r => r.update_at?.startsWith(String(year)));
  const yearPosts = data.posts.filter(p => p.update_at?.startsWith(String(year)));

  // 按月分组
  const monthlyData: Record<string, { reviews: string[]; posts: string[] }> = {};
  
  for (let m = 1; m <= 12; m++) {
    const monthStr = `${year}-${String(m).padStart(2, '0')}`;
    monthlyData[`${m}月`] = { reviews: [], posts: [] };
    
    yearReviews
      .filter(r => r.update_at?.startsWith(monthStr))
      .forEach(r => {
        const text = extractTextFromContent(r.content);
        const excerpt = text.length > 300 ? text.slice(0, 300) + '...' : text;
        const product = r.product?.name || '未知产品';
        monthlyData[`${m}月`].reviews.push(`[${r.update_at?.split('T')[0]}] ${product}: ${excerpt}`);
      });
    
    yearPosts
      .filter(p => p.update_at?.startsWith(monthStr))
      .forEach(p => {
        const text = extractTextFromContent(p.content);
        const excerpt = text.length > 300 ? text.slice(0, 300) + '...' : text;
        monthlyData[`${m}月`].posts.push(`[${p.update_at?.split('T')[0]}] ${p.title}: ${excerpt}`);
      });
  }

  // 构建摘要
  let summary = `## 用户信息
- 昵称：${data.nickname}
- 年份：${year}

## 年度统计
- 猹评总数：${yearReviews.length}
- 讨论总数：${yearPosts.length}

## 月度数据详情
`;

  for (const [month, items] of Object.entries(monthlyData)) {
    if (items.reviews.length === 0 && items.posts.length === 0) continue;
    
    summary += `\n### ${month}\n`;
    if (items.reviews.length > 0) {
      summary += `**猹评 (${items.reviews.length}条)**\n`;
      summary += items.reviews.map(r => `- ${r}`).join('\n') + '\n';
    }
    if (items.posts.length > 0) {
      summary += `**讨论 (${items.posts.length}条)**\n`;
      summary += items.posts.map(p => `- ${p}`).join('\n') + '\n';
    }
  }

  return summary.trim();
}
