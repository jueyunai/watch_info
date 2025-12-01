import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatReviewForExport, formatReviewsForExport } from './exporter';
import type { Review } from '../types';

// 生成随机 Review 对象
const reviewArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  productName: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('【') && !s.includes('】')),
  updateAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
  content: fc.string({ minLength: 1, maxLength: 200 }),
  rawUpdateAt: fc.constant(''),
}).map(r => ({ ...r, rawUpdateAt: r.updateAt.toISOString() }));

describe('formatReviewForExport', () => {
  // **Feature: watcha-reviews-exporter, Property 8: 导出格式正确性**
  // **Validates: Requirements 5.2**

  it('should include product name in output', () => {
    fc.assert(
      fc.property(
        reviewArb,
        (review) => {
          const output = formatReviewForExport(review);
          return output.includes(review.productName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include formatted time in output', () => {
    fc.assert(
      fc.property(
        reviewArb,
        (review) => {
          const output = formatReviewForExport(review);
          // 输出应该包含 "时间：" 标签
          return output.includes('时间：');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include content in output', () => {
    fc.assert(
      fc.property(
        reviewArb.filter(r => r.content.length > 0 && !r.content.includes('\n')),
        (review) => {
          const output = formatReviewForExport(review);
          return output.includes(review.content);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should format with correct structure', () => {
    const review: Review = {
      id: 1,
      productName: 'TestProduct',
      updateAt: new Date('2025-11-29T09:59:40.159Z'),
      content: '这是测试内容',
      rawUpdateAt: '2025-11-29T09:59:40.159Z',
    };

    const output = formatReviewForExport(review);
    
    expect(output).toContain('【TestProduct】');
    expect(output).toContain('时间：');
    expect(output).toContain('内容：这是测试内容');
  });
});

describe('formatReviewsForExport', () => {
  it('should number reviews sequentially', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 1, maxLength: 10 }),
        (reviews) => {
          const output = formatReviewsForExport(reviews);
          // 检查是否包含序号
          for (let i = 1; i <= reviews.length; i++) {
            if (!output.includes(`${i}. 【`)) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should separate reviews with dividers', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 2, maxLength: 5 }),
        (reviews) => {
          const output = formatReviewsForExport(reviews);
          // 多条记录之间应该有分隔符
          return output.includes('='.repeat(50));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty array', () => {
    const output = formatReviewsForExport([]);
    expect(output).toBe('');
  });
});
