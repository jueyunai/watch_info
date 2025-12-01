# Vercel 部署修复说明

## 问题分析

### 错误信息
```
Error: Function Runtimes must have a valid version, for example `now-php@1.0.0`.
```

### 根本原因
在 `vercel.json` 中手动配置 `functions.runtime` 导致 Vercel 部署失败。

### 成功版本对比
- **成功版本** (51b077b): 没有 `vercel.json` 文件
- **失败版本** (aa66d10-b001134): 包含 `vercel.json` 配置

## 解决方案

### 删除 vercel.json
让 Vercel 自动检测项目配置，而不是手动指定。

**删除前**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x"
    }
  }
}
```

**删除后**: 无 `vercel.json` 文件

### Vercel 自动检测行为

1. **前端应用**
   - 自动检测 Vite 项目
   - 运行 `npm run build`
   - 输出到 `dist/` 目录

2. **API 路由**
   - 自动检测 `api/` 目录
   - 将 TypeScript 文件编译为 Serverless Functions
   - 自动选择合适的 Node.js 运行时

## 项目结构

```
watcha-reviews-exporter/
├── api/
│   └── proxy.ts          # API 代理 (Serverless Function)
├── src/
│   ├── services/
│   │   └── api.ts        # 前端 API 调用
│   └── ...
├── dist/                 # 构建输出
├── package.json
└── (无 vercel.json)
```

## API 代理工作流程

```
用户请求
  ↓
前端: /api/proxy?path=users/xxx
  ↓
Vercel Serverless Function: api/proxy.ts
  ↓
转发到: https://watcha.cn/api/v2/users/xxx
  ↓
返回数据给前端
```

## 部署步骤

1. **提交代码**
   ```bash
   git add -A
   git commit -m "Remove vercel.json - let Vercel auto-detect configuration"
   git push origin main
   ```

2. **Vercel 自动部署**
   - 检测 Vite 项目
   - 检测 `api/` 目录
   - 自动配置并部署

3. **验证**
   - 访问 https://watch-info.vercel.app/
   - 测试功能

## 关键要点

1. **不要手动配置 runtime**
   - Vercel 会自动选择合适的运行时
   - 手动配置容易出错

2. **依赖 Vercel 的约定**
   - `api/` 目录自动识别为 Serverless Functions
   - TypeScript 文件自动编译

3. **保持简单**
   - 只在必要时使用 `vercel.json`
   - 大多数情况下自动检测就够了

## 测试结果

- ✅ 构建成功
- ✅ 所有测试通过 (43/43)
- ⏳ 等待 Vercel 部署完成

---

**修复日期**: 2025-12-02  
**提交**: 444ab84
