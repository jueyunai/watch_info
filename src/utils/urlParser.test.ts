import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseWatchaUrl } from './urlParser';

describe('parseWatchaUrl', () => {
  // **Feature: watcha-reviews-exporter, Property 1: URL 解析正确性**
  // **Validates: Requirements 1.1, 1.2**
  
  it('should correctly parse valid watcha URLs', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0 && s.length <= 50),
        (username) => {
          const url = `https://watcha.cn/@${username}`;
          const result = parseWatchaUrl(url);
          return result.success === true && result.username === username;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept URLs with http protocol', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0 && s.length <= 50),
        (username) => {
          const url = `http://watcha.cn/@${username}`;
          const result = parseWatchaUrl(url);
          return result.success === true && result.username === username;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept URLs with trailing slash', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0 && s.length <= 50),
        (username) => {
          const url = `https://watcha.cn/@${username}/`;
          const result = parseWatchaUrl(url);
          return result.success === true && result.username === username;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject invalid URLs', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !s.match(/^https?:\/\/watcha\.cn\/@[a-zA-Z0-9_-]+\/?$/)),
        (invalidUrl) => {
          const result = parseWatchaUrl(invalidUrl);
          return result.success === false && result.error !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge cases', () => {
    expect(parseWatchaUrl('')).toEqual({ success: false, error: '请输入有效的 URL' });
    expect(parseWatchaUrl('   ')).toEqual({ success: false, error: '请输入有效的 URL' });
    expect(parseWatchaUrl('https://watcha.cn/')).toMatchObject({ success: false });
    expect(parseWatchaUrl('https://watcha.cn/@')).toMatchObject({ success: false });
    expect(parseWatchaUrl('https://other.com/@user')).toMatchObject({ success: false });
  });

  it('should correctly extract username zhiyun', () => {
    const result = parseWatchaUrl('https://watcha.cn/@zhiyun');
    expect(result).toEqual({ success: true, username: 'zhiyun' });
  });
});
