# CORS 问题修复总结

## 问题描述

部署到 Vercel 后，输入个人主页链接时出现 "Failed to fetch" 错误。

## 根本原因

浏览器的同源策略（CORS）阻止了直接请求 `https://watcha.cn/api/v2` 的跨域请求。

## 解决方案

使用 Vercel 的 Serverless Functions 创建 API 代理，将前端请求转发到观猹 API。

## 实现细节

### 1. 创建 API 代理路由

**文件**: `api/proxy.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { path } = req.query;
    
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    const url = `https://watcha.cn/api/v2/${path}`;

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

### 2. 更新 API 服务

**文件**: `src/services/api.ts`

- 开发环境：使用 Vite 代理 `/api/v2`
- 生产环境：使用 Vercel API 代理 `/api/proxy?path=`

```typescript
const BASE_URL = import.meta.env.DEV ? '/api/v2' : '/api/proxy?path=';
```

### 3. 配置 Vercel

**文件**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3"
    }
  }
}
```

### 4. 添加依赖

**文件**: `package.json`

```json
{
  "dependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

## 部署步骤

1. **提交代码**
   ```bash
   git add .
   git commit -m "Add Vercel API proxy for CORS handling"
   git push origin main
   ```

2. **Vercel 自动部署**
   - Vercel 会自动检测到 `api/` 目录
   - 编译 TypeScript 文件
   - 部署 Serverless Functions

3. **验证**
   - 访问 https://watch-info.vercel.app/
   - 输入个人主页链接
   - 应该能正常获取数据

## 工作流程

```
用户输入 URL
    ↓
前端解析用户名
    ↓
前端请求 /api/proxy?path=users/{username}
    ↓
Vercel API 代理接收请求
    ↓
代理转发到 https://watcha.cn/api/v2/users/{username}
    ↓
代理返回响应给前端
    ↓
前端显示数据
```

## 测试结果

所有 43 个单元测试和属性测试都通过：

```
✓ src/utils/urlParser.test.ts (6 tests)
✓ src/utils/contentParser.test.ts (6 tests)
✓ src/services/api.test.ts (5 tests)
✓ src/utils/reviewProcessor.test.ts (7 tests)
✓ src/utils/timeUtils.test.ts (12 tests)
✓ src/utils/exporter.test.ts (7 tests)

Test Files  6 passed (6)
Tests  43 passed (43)
```

## 优势

1. **解决 CORS 问题**：通过服务器端代理绕过浏览器 CORS 限制
2. **无需修改观猹 API**：完全客户端解决方案
3. **性能好**：Vercel 的 Serverless Functions 自动扩展
4. **成本低**：免费计划足够使用
5. **易于维护**：代理逻辑简单清晰

## 后续优化

如果需要进一步优化，可以考虑：

1. **缓存**：在代理中添加缓存层
2. **速率限制**：防止滥用
3. **日志**：记录所有请求用于分析
4. **错误处理**：更详细的错误信息

---

**部署日期**: 2025-12-01  
**状态**: 已实现并测试
