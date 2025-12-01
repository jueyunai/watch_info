# Bug 修复：URL 编码问题导致查询参数丢失

## 问题描述

**症状**：
- 两次不同的 API 请求返回相同的数据
- `skip=0` 和 `skip=20` 的请求结果一样
- 导致获取重复的猹评数据

**实际请求**：
```
/api/proxy?path=users/10000120/reviews?_user_id=10000120&skip=0&limit=20
/api/proxy?path=users/10000120/reviews?_user_id=10000120&skip=20&limit=20
```

## 根本原因

### URL 结构问题

**错误的 URL 构建**：
```typescript
const BASE_URL = '/api/proxy?path=';
const path = `users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${limit}`;
const url = `${BASE_URL}${path}`;
```

生成的 URL：
```
/api/proxy?path=users/10000120/reviews?_user_id=10000120&skip=0&limit=20
         ↑                            ↑
      第一个 ?                     第二个 ?
```

### 浏览器如何解析这个 URL

浏览器会将 URL 解析为：
```
路径: /api/proxy
查询参数:
  - path = "users/10000120/reviews"
  - _user_id = "10000120"
  - skip = "0"
  - limit = "20"
```

**问题**：
- `path` 参数只包含 `users/10000120/reviews`
- `_user_id`, `skip`, `limit` 被当作 URL 的查询参数，而不是 `path` 的一部分
- API 代理接收到的 `path` 缺少查询参数
- 所以无论 `skip` 是多少，实际请求的都是 `https://watcha.cn/api/v2/users/10000120/reviews`（没有查询参数）

### 验证问题

在 F12 Network 面板中查看：
```
请求 1: /api/proxy?path=users/10000120/reviews?_user_id=10000120&skip=0&limit=20
请求 2: /api/proxy?path=users/10000120/reviews?_user_id=10000120&skip=20&limit=20

实际发送到后端的 path 参数:
请求 1: "users/10000120/reviews"  ❌ 查询参数丢失
请求 2: "users/10000120/reviews"  ❌ 查询参数丢失

结果: 两次请求返回相同的数据
```

## 解决方案

### URL 编码

使用 `encodeURIComponent()` 对 `path` 参数进行编码：

```typescript
const path = `users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${limit}`;
const url = `${BASE_URL}${encodeURIComponent(path)}`;
```

### 编码后的 URL

```
/api/proxy?path=users%2F10000120%2Freviews%3F_user_id%3D10000120%26skip%3D0%26limit%3D20
```

浏览器解析：
```
路径: /api/proxy
查询参数:
  - path = "users/10000120/reviews?_user_id=10000120&skip=0&limit=20"  ✅ 完整的路径
```

### 修复后的代码

```typescript
export async function fetchReviews(
  userId: number,
  skip: number = 0,
  limit: number = PAGE_SIZE
): Promise<ReviewsResponse> {
  const path = `users/${userId}/reviews?_user_id=${userId}&skip=${skip}&limit=${limit}`;
  
  // ✅ 生产环境需要对path进行URL编码
  const url = import.meta.env.DEV 
    ? `${BASE_URL}/${path}`
    : `${BASE_URL}${encodeURIComponent(path)}`;
  
  console.log(`Fetching URL: ${url}`);
  
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  // ... 其余代码
}
```

## 技术细节

### encodeURIComponent 的作用

将特殊字符转换为 URL 安全的格式：

| 字符 | 编码后 | 说明 |
|------|--------|------|
| `/`  | `%2F`  | 斜杠 |
| `?`  | `%3F`  | 问号 |
| `=`  | `%3D`  | 等号 |
| `&`  | `%26`  | 与符号 |
| `:`  | `%3A`  | 冒号 |

### 为什么开发环境不需要编码？

**开发环境**（Vite 代理）：
```typescript
const url = `${BASE_URL}/${path}`;
// 结果: /api/v2/users/10000120/reviews?_user_id=10000120&skip=0&limit=20
```

这是一个正常的 URL，浏览器会正确解析：
```
路径: /api/v2/users/10000120/reviews
查询参数:
  - _user_id = "10000120"
  - skip = "0"
  - limit = "20"
```

Vite 代理会将整个请求转发到 `https://watcha.cn`，包括查询参数。

**生产环境**（Vercel API 代理）：
```typescript
const url = `${BASE_URL}${encodeURIComponent(path)}`;
// 结果: /api/proxy?path=users%2F10000120%2Freviews%3F_user_id%3D10000120%26skip%3D0%26limit%3D20
```

这样 `path` 参数才能包含完整的路径和查询参数。

## 修复效果

### 修复前

```
请求 1: skip=0  → API 收到: users/10000120/reviews (无查询参数)
请求 2: skip=20 → API 收到: users/10000120/reviews (无查询参数)

结果: 两次返回相同的数据（前 20 条）
```

### 修复后

```
请求 1: skip=0  → API 收到: users/10000120/reviews?_user_id=10000120&skip=0&limit=20
请求 2: skip=20 → API 收到: users/10000120/reviews?_user_id=10000120&skip=20&limit=20

结果: 
  - 请求 1 返回第 1-20 条
  - 请求 2 返回第 21-26 条
  - 总共 26 条不重复的猹评
```

## 验证步骤

1. **等待 Vercel 部署完成**

2. **测试用户 @10000120**（26 条猹评）
   - 访问 https://watch-info.vercel.app/
   - 输入 `https://watcha.cn/@10000120`
   - 打开浏览器控制台（F12）

3. **查看 Network 请求**
   ```
   请求 1: /api/proxy?path=users%2F10000120%2Freviews%3F_user_id%3D10000120%26skip%3D0%26limit%3D20
   请求 2: /api/proxy?path=users%2F10000120%2Freviews%3F_user_id%3D10000120%26skip%3D20%26limit%3D20
   ```

4. **查看控制台日志**
   ```
   Fetching reviews: skip=0, limit=20
   Fetching URL: /api/proxy?path=users%2F10000120%2Freviews%3F_user_id%3D10000120%26skip%3D0%26limit%3D20
   Total reviews: 26
   Received 20 items
   Added 20 new items, total now: 20
   
   Fetching reviews: skip=20, limit=20
   Fetching URL: /api/proxy?path=users%2F10000120%2Freviews%3F_user_id%3D10000120%26skip%3D20%26limit%3D20
   Received 6 items
   Added 6 new items, total now: 26
   Received 6 < 20, last page reached
   
   Final count: 26 reviews
   ```

5. **确认结果**
   - 应该显示"共 26 条猹评"
   - 不应该有重复警告
   - 导出的文件应该包含 26 条不重复的猹评

## 相关问题

这个 bug 同时解决了：
1. **无限循环问题**：因为每次都返回相同的数据，导致无法满足退出条件
2. **重复数据问题**：因为多次请求返回相同的数据，导致重复

## 经验教训

1. **URL 编码的重要性**
   - 当 URL 参数本身包含特殊字符（如 `?`, `&`, `=`）时，必须编码
   - 否则会被浏览器错误解析

2. **开发环境 vs 生产环境**
   - 开发环境和生产环境的 URL 结构可能不同
   - 需要分别处理

3. **调试技巧**
   - 使用 F12 Network 面板查看实际发送的请求
   - 对比请求和响应，找出问题所在

4. **防御性编程**
   - 添加日志输出实际的 URL
   - 添加去重逻辑作为后备方案

---

**修复日期**: 2025-12-02  
**提交**: 09809c1  
**状态**: 已修复，等待验证
