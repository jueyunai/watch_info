# Vercel 部署指南

## 概述

这个项目是一个纯前端 Vite + TypeScript 应用，完全可以部署到 Vercel。Vercel 会自动检测 Vite 项目并进行构建。

## 部署方式

### 方式 1：通过 GitHub 连接（推荐）

**优点**：自动 CI/CD，每次 push 自动部署

#### 步骤：

1. **访问 Vercel 官网**
   - 打开 https://vercel.com
   - 点击 "Sign Up" 或 "Log In"
   - 选择 "Continue with GitHub"

2. **授权 GitHub**
   - 允许 Vercel 访问你的 GitHub 账户
   - 选择要部署的仓库：`watch_info`

3. **配置项目**
   - **Project Name**：`watcha-reviews-exporter`（或自定义）
   - **Framework Preset**：选择 `Vite`（Vercel 会自动检测）
   - **Root Directory**：`./watcha-reviews-exporter`（如果是 monorepo）或留空
   - **Build Command**：`npm run build`（默认）
   - **Output Directory**：`dist`（默认）
   - **Install Command**：`npm install`（默认）

4. **环境变量**（可选）
   - 如果需要代理 API，可以在这里配置
   - 暂时不需要配置

5. **点击 "Deploy"**
   - Vercel 会自动构建并部署
   - 部署完成后会获得一个 URL，如：`https://watcha-reviews-exporter.vercel.app`

---

### 方式 2：使用 Vercel CLI（本地部署）

#### 安装 Vercel CLI

```bash
npm install -g vercel
```

#### 部署步骤

```bash
# 进入项目目录
cd watcha-reviews-exporter

# 登录 Vercel
vercel login

# 部署
vercel

# 部署到生产环境
vercel --prod
```

---

## 部署后的问题和解决方案

### 问题 1：CORS 错误

**症状**：部署后访问 API 时出现 "Failed to fetch" 错误

**原因**：浏览器直接请求 `https://watcha.cn/api/...` 被 CORS 阻止

**解决方案**：使用 Vercel 的 API 路由作为代理

#### 实现步骤

1. **创建 API 代理路由** (`api/proxy.ts`)
   - 已在项目中创建
   - 处理所有来自前端的 API 请求
   - 转发到 `https://watcha.cn/api/v2`
   - 设置正确的 CORS 头

2. **更新前端 API 服务** (`src/services/api.ts`)
   - 开发环境：使用 Vite 代理 `/api/v2`
   - 生产环境：使用 Vercel API 代理 `/api/proxy?path=`

3. **配置 Vercel** (`vercel.json`)
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

4. **添加依赖** (`package.json`)
   - 已添加 `@vercel/node@^3.0.0`

#### 部署步骤

1. 提交代码到 GitHub：
   ```bash
   git add .
   git commit -m "Add Vercel API proxy for CORS handling"
   git push origin main
   ```

2. Vercel 会自动检测到 `api/` 目录并部署 API 路由

3. 测试：
   - 访问 https://watch-info.vercel.app/
   - 输入个人主页链接
   - 应该能正常获取数据

---

### 问题 2：环境变量配置

如果需要在不同环境使用不同的 API 地址：

1. **创建 `.env.local`（本地开发）**

```
VITE_API_BASE_URL=https://watcha.cn/api/v2
```

2. **在 Vercel 中配置环境变量**

- 进入项目设置 → Settings → Environment Variables
- 添加：
  - **Name**: `VITE_API_BASE_URL`
  - **Value**: `https://watcha.cn/api/v2`（或代理 URL）

3. **在代码中使用**

```typescript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://watcha.cn/api/v2';
```

---

### 问题 3：构建失败

**症状**：部署时出现构建错误

**检查清单**：

1. 确保 `package.json` 中有 `build` 脚本
2. 确保所有依赖都在 `package.json` 中（不在 `node_modules`）
3. 检查 TypeScript 编译错误：

```bash
npm run build
```

4. 查看 Vercel 的构建日志获取详细错误信息

---

## 自动部署配置

### 自动部署规则

Vercel 默认配置：
- **Production Branch**: `main`（每次 push 到 main 自动部署）
- **Preview Branch**: 其他分支（创建 PR 时自动生成预览 URL）

### 自定义部署规则

在 `vercel.json` 中配置：

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "git": {
    "deploymentEnabled": {
      "main": true,
      "develop": false
    }
  }
}
```

---

## 性能优化

### 1. 启用 Vercel Analytics

```bash
npm install @vercel/analytics
```

在 `src/main.ts` 中添加：

```typescript
import { inject } from '@vercel/analytics';
inject();
```

### 2. 启用 Web Vitals 监控

```bash
npm install web-vitals
```

### 3. 缓存优化

Vercel 会自动为 `dist` 目录中的文件设置长期缓存。

---

## 自定义域名

1. 进入项目设置 → Domains
2. 添加自定义域名，如 `watcha-exporter.com`
3. 按照 Vercel 的指示配置 DNS 记录

---

## 监控和日志

### 查看部署日志

1. 进入 Vercel Dashboard
2. 选择项目
3. 点击 "Deployments" 查看部署历史
4. 点击具体部署查看构建日志

### 实时监控

- **Analytics**: 查看访问量、性能指标
- **Monitoring**: 查看错误和性能问题

---

## 常用命令

```bash
# 本地预览生产构建
npm run preview

# 查看构建大小
npm run build -- --report

# 清理缓存后重新部署
vercel --prod --force
```

---

## 成本

- **免费计划**：足够个人项目使用
  - 无限部署
  - 自动 HTTPS
  - 全球 CDN
  - 100GB 带宽/月

- **Pro 计划**：$20/月
  - 更多高级功能
  - 优先支持

---

## 故障排查

| 问题 | 解决方案 |
|------|----------|
| 部署失败 | 检查构建日志，确保 `npm run build` 本地可以成功 |
| 页面 404 | 确保 `outputDirectory` 设置为 `dist` |
| API 请求失败 | 配置 CORS 代理或 API 路由 |
| 环境变量未生效 | 重新部署，确保变量已保存 |
| 性能慢 | 检查 Analytics，优化资源大小 |

---

## 下一步

1. 在 Vercel 上创建账户
2. 连接 GitHub 仓库
3. 配置 CORS 代理（如需要）
4. 部署并测试
5. 配置自定义域名（可选）

---

*部署指南版本：v1.0*  
*最后更新：2025-12-01*
