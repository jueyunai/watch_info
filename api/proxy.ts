import type { VercelRequest, VercelResponse } from '@vercel/node';

// 允许的来源列表
const ALLOWED_ORIGINS = [
  // 生产环境
  'https://watcha.jueyunai.com',
  'https://watch-info.vercel.app',
  // 开发环境
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

// 允许的 API 路径模式（正则表达式）
const ALLOWED_PATHS = [
  /^users\/[\w\-\.%]+$/,           // 用户信息: users/username
  /^users\/\d+\/reviews/,          // 用户猹评: users/123/reviews?skip=0&limit=20
  /^users\/\d+\/posts/,            // 用户讨论: users/123/posts?skip=0&limit=20
];

// 验证请求来源
function isRequestAllowed(req: VercelRequest): boolean {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';

  const isOriginAllowed = ALLOWED_ORIGINS.includes(origin);
  const isRefererAllowed = ALLOWED_ORIGINS.some(o => referer.startsWith(o));

  return isOriginAllowed || isRefererAllowed;
}

// 验证路径是否在白名单中
function isPathAllowed(path: string): boolean {
  // 解码并移除查询参数用于验证
  try {
    const decoded = decodeURIComponent(path);
    const pathWithoutQuery = decoded.split('?')[0];
    return ALLOWED_PATHS.some(pattern => pattern.test(pathWithoutQuery));
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';

  // 🔒 动态设置 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS 预检请求放行
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 🔒 验证请求来源
  if (!isRequestAllowed(req)) {
    console.warn(`[Proxy] 拒绝非法请求: origin=${origin}`);
    return res.status(403).json({
      error: 'Forbidden',
      message: '请从官方页面访问'
    });
  }

  try {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Missing path parameter' });
    }

    // 🔒 验证路径白名单
    if (!isPathAllowed(path)) {
      console.warn(`[Proxy] 拒绝非法路径: ${path}`);
      return res.status(400).json({
        error: 'Invalid path',
        message: '不支持的 API 路径'
      });
    }

    const url = `https://watcha.cn/api/v2/${path}`;

    const response = await fetch(url, {
      method: req.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      console.warn('Upstream returned non-JSON:', response.status, text.slice(0, 100));
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Proxy error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

