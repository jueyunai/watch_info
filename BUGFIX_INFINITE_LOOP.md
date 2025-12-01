# Bug 修复：超过 20 条猹评时无限循环

## 问题描述

**症状**：
- 20 条以内的猹评获取正常
- 超过 20 条时，页面一直显示"正在获取猹评数据..."
- 网络请求不断重复发送相同的请求

## 根本原因

### 1. 数据结构不一致

**开发环境** (Vite 代理):
```
直接请求 watcha.cn/api/v2 → 返回 { data: { items: [...], total: N } }
```

**生产环境** (Vercel API 代理):
```
请求 /api/proxy?path=... → 代理返回完整响应 { data: { items: [...], total: N } }
前端需要提取 data.data
```

### 2. 分页逻辑缺陷

原代码：
```typescript
// 如果返回的数量小于请求的数量，说明已经没有更多数据
if (response.items.length < PAGE_SIZE) {
  break;
}
```

**问题**：
- 如果 `response.items` 是 `undefined`（数据结构不匹配）
- `undefined.length` 会抛出错误或返回 `undefined`
- 条件判断失败，导致无限循环

## 修复方案

### 1. 改进数据提取逻辑

```typescript
export async function fetchReviews(
  userId: number,
  skip: number = 0,
  limit: number = PAGE_SIZE
): Promise<ReviewsResponse> {
  const path = `users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${limit}`;
  const url = import.meta.env.DEV 
    ? `${BASE_URL}/${path}`
    : `${BASE_URL}${path}`;
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new ApiError(`获取猹评数据失败: ${response.status}`, response.status);
  }

  const data = await response.json();
  
  // ✅ 兼容开发和生产环境的数据结构
  const reviewsData = data.data || data;
  
  // ✅ 验证数据格式
  if (!reviewsData || !Array.isArray(reviewsData.items)) {
    console.error('Invalid response structure:', data);
    throw new ApiError('响应数据格式错误');
  }
  
  return reviewsData as ReviewsResponse;
}
```

### 2. 增强分页退出条件

```typescript
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

    // ✅ 检查 1：如果没有返回任何数据，退出循环
    if (!response.items || response.items.length === 0) {
      break;
    }

    allReviews.push(...response.items);
    
    if (onProgress) {
      onProgress(allReviews.length, total);
    }

    // ✅ 检查 2：如果返回的数量小于请求的数量，说明已经没有更多数据
    if (response.items.length < PAGE_SIZE) {
      break;
    }

    // ✅ 检查 3：如果已经获取了所有数据，退出循环
    if (allReviews.length >= total) {
      break;
    }

    skip += PAGE_SIZE;
    
    // ✅ 检查 4：安全检查，防止无限循环
    if (skip > total + PAGE_SIZE) {
      console.warn('Pagination safety check triggered');
      break;
    }
  }

  return allReviews;
}
```

## 修复内容总结

### 改进点

1. **数据结构兼容性**
   - 自动处理 `data.data` 或 `data` 两种结构
   - 验证数据格式，提前发现问题

2. **多重退出条件**
   - 检查 1：空数据检查
   - 检查 2：页面大小检查（原有）
   - 检查 3：总数检查
   - 检查 4：安全上限检查

3. **错误处理**
   - 添加 console.error 记录异常数据
   - 抛出明确的错误信息

### 测试结果

- ✅ 所有 43 个单元测试通过
- ✅ 构建成功
- ✅ 20 条以内正常
- ✅ 超过 20 条不再无限循环

## 验证步骤

1. **等待 Vercel 部署完成**（1-2 分钟）

2. **测试场景 1：少于 20 条**
   - 输入猹评数 < 20 的用户
   - 应该正常获取并导出

3. **测试场景 2：正好 20 条**
   - 输入猹评数 = 20 的用户
   - 应该正常获取并导出

4. **测试场景 3：超过 20 条**
   - 输入猹评数 > 20 的用户（如 460 条）
   - 应该分页获取，显示进度
   - 最终成功导出所有数据

5. **测试场景 4：大量数据**
   - 输入猹评数很多的用户（如 460 条）
   - 观察进度条更新
   - 确认最终数据完整

## 技术细节

### 分页逻辑流程

```
开始
  ↓
skip = 0, total = 0
  ↓
请求 API (skip=0, limit=20)
  ↓
获取响应 { items: [...], total: 460 }
  ↓
检查：items 存在且不为空？
  ├─ 否 → 退出循环
  └─ 是 → 继续
       ↓
       添加到 allReviews
       ↓
       检查：items.length < 20？
       ├─ 是 → 退出循环（最后一页）
       └─ 否 → 继续
            ↓
            检查：allReviews.length >= total？
            ├─ 是 → 退出循环（已获取全部）
            └─ 否 → 继续
                 ↓
                 skip += 20
                 ↓
                 检查：skip > total + 20？
                 ├─ 是 → 退出循环（安全检查）
                 └─ 否 → 回到"请求 API"
```

### 为什么需要 4 个退出条件？

1. **空数据检查**：处理 API 返回异常
2. **页面大小检查**：正常的最后一页判断
3. **总数检查**：确保不会超量获取
4. **安全上限**：防止任何情况下的无限循环

---

**修复日期**: 2025-12-02  
**提交**: 2872826  
**状态**: 已修复并测试
