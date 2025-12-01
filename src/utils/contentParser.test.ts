import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { parseContent, extractPlainText } from './contentParser';
import type { ContentNode } from '../types';



describe('parseContent', () => {
  // **Feature: watcha-reviews-exporter, Property 3: 内容解析完整性**
  // **Validates: Requirements 3.2, 6.1, 6.2, 6.3, 6.4**

  it('should extract all text from nested content', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        (texts) => {
          const content: ContentNode = {
            type: 'doc',
            content: texts.map(text => ({
              type: 'paragraph',
              content: [{ type: 'text', text }],
            })),
          };
          const result = parseContent(content);
          // 所有文本都应该出现在结果中
          return texts.every(text => result.includes(text));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ignore marks and preserve text', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        (text) => {
          const content: ContentNode = {
            type: 'doc',
            content: [{
              type: 'paragraph',
              content: [{
                type: 'text',
                text,
                marks: [{ type: 'bold' }, { type: 'italic' }],
              }],
            }],
          };
          const result = parseContent(content);
          return result.includes(text);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should add newlines between paragraphs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
        (texts) => {
          const content: ContentNode = {
            type: 'doc',
            content: texts.map(text => ({
              type: 'paragraph',
              content: [{ type: 'text', text }],
            })),
          };
          const result = parseContent(content);
          // 结果中应该包含换行符（段落之间）
          return texts.length <= 1 || result.includes('\n');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle LineBreak nodes', () => {
    const content: ContentNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 1' }] },
        { type: 'LineBreak' },
        { type: 'paragraph', content: [{ type: 'text', text: 'Line 2' }] },
      ],
    };
    const result = parseContent(content);
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
    expect(result).toContain('\n');
  });

  it('should handle empty or null input', () => {
    expect(parseContent(null as unknown as ContentNode)).toBe('');
    expect(parseContent({} as ContentNode)).toBe('');
    expect(parseContent({ type: 'doc' })).toBe('');
  });

  it('should parse real watcha content structure', () => {
    const realContent: ContentNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '创意很好，但实现出来～ ' },
            { type: 'text', text: '成本敏感性用户很难接受', marks: [{ type: 'bold' }] },
          ],
        },
        { type: 'paragraph' },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '1、认真看了产品介绍视频' }],
        },
      ],
    };
    const result = extractPlainText(realContent);
    expect(result).toContain('创意很好');
    expect(result).toContain('成本敏感性用户很难接受');
    expect(result).toContain('1、认真看了产品介绍视频');
  });
});
