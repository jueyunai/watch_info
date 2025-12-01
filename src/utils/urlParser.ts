import type { ParseResult } from '../types';

const WATCHA_URL_PATTERN = /^https?:\/\/watcha\.cn\/@([a-zA-Z0-9_-]+)\/?$/;

export function parseWatchaUrl(url: string): ParseResult {
  if (!url || typeof url !== 'string') {
    return { success: false, error: '请输入有效的 URL' };
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return { success: false, error: '请输入有效的 URL' };
  }

  const match = trimmedUrl.match(WATCHA_URL_PATTERN);
  if (!match) {
    return { 
      success: false, 
      error: '请输入正确的观猹个人主页地址，格式：https://watcha.cn/@用户名' 
    };
  }

  return { success: true, username: match[1] };
}
