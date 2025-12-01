import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { sortReviewsByDate, filterReviewsByDateRange, filterReviewsByMonth } from './reviewProcessor';
import type { Review } from '../types';

// 生成随机 Review 对象
const reviewArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  productName: fc.string({ minLength: 1, maxLength: 50 }),
  updateAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
  content: fc.string({ minLength: 0, maxLength: 200 }),
  rawUpdateAt: fc.constant(''),
}).map(r => ({ ...r, rawUpdateAt: r.updateAt.toISOString() }));

describe('sortReviewsByDate', () => {
  // **Feature: watcha-reviews-exporter, Property 5: 排序正确性**
  // **Validates: Requirements 3.4**

  it('should sort reviews in descending order by default', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 2, maxLength: 20 }),
        (reviews) => {
          const sorted = sortReviewsByDate(reviews);
          // 检查每对相邻元素，前一个的时间应该 >= 后一个
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].updateAt.getTime() < sorted[i + 1].updateAt.getTime()) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve all reviews after sorting', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 20 }),
        (reviews) => {
          const sorted = sortReviewsByDate(reviews);
          return sorted.length === reviews.length;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not mutate original array', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 1, maxLength: 10 }),
        (reviews) => {
          const originalIds = reviews.map(r => r.id);
          sortReviewsByDate(reviews);
          const afterIds = reviews.map(r => r.id);
          return JSON.stringify(originalIds) === JSON.stringify(afterIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('filterReviewsByDateRange', () => {
  // **Feature: watcha-reviews-exporter, Property 6: 时间筛选正确性**
  // **Validates: Requirements 4.1, 4.3, 5.4**

  it('should only include reviews within the date range', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 20 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-06-01'), noInvalidDate: true }),
        fc.date({ min: new Date('2025-06-02'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (reviews, startDate, endDate) => {
          const filtered = filterReviewsByDateRange(reviews, startDate, endDate);
          // 所有筛选结果都应该在范围内
          return filtered.every(r => 
            r.updateAt.getTime() >= startDate.getTime() &&
            r.updateAt.getTime() <= endDate.getTime()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include all reviews that are within the range', () => {
    fc.assert(
      fc.property(
        fc.array(reviewArb, { minLength: 0, maxLength: 20 }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-06-01'), noInvalidDate: true }),
        fc.date({ min: new Date('2025-06-02'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (reviews, startDate, endDate) => {
          const filtered = filterReviewsByDateRange(reviews, startDate, endDate);
          const filteredIds = new Set(filtered.map(r => r.id));
          
          // 原列表中所有在范围内的都应该出现在结果中
          const inRangeFromOriginal = reviews.filter(r =>
            r.updateAt.getTime() >= startDate.getTime() &&
            r.updateAt.getTime() <= endDate.getTime()
          );
          
          return inRangeFromOriginal.every(r => filteredIds.has(r.id));
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('filterReviewsByMonth', () => {
  it('should filter reviews for a specific month', () => {
    const reviews: Review[] = [
      { id: 1, productName: 'A', updateAt: new Date('2025-11-15'), content: '', rawUpdateAt: '' },
      { id: 2, productName: 'B', updateAt: new Date('2025-10-15'), content: '', rawUpdateAt: '' },
      { id: 3, productName: 'C', updateAt: new Date('2025-11-30'), content: '', rawUpdateAt: '' },
      { id: 4, productName: 'D', updateAt: new Date('2025-12-01'), content: '', rawUpdateAt: '' },
    ];

    const filtered = filterReviewsByMonth(reviews, 2025, 11);
    expect(filtered.length).toBe(2);
    expect(filtered.map(r => r.id).sort()).toEqual([1, 3]);
  });

  it('should handle month boundaries correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          // 创建月初和月末的 review
          const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
          const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
          const beforeMonth = new Date(year, month - 1, 0, 23, 59, 59, 999);
          const afterMonth = new Date(year, month, 1, 0, 0, 0, 0);

          const reviews: Review[] = [
            { id: 1, productName: 'Start', updateAt: startOfMonth, content: '', rawUpdateAt: '' },
            { id: 2, productName: 'End', updateAt: endOfMonth, content: '', rawUpdateAt: '' },
            { id: 3, productName: 'Before', updateAt: beforeMonth, content: '', rawUpdateAt: '' },
            { id: 4, productName: 'After', updateAt: afterMonth, content: '', rawUpdateAt: '' },
          ];

          const filtered = filterReviewsByMonth(reviews, year, month);
          const ids = filtered.map(r => r.id).sort();
          
          // 应该只包含 id 1 和 2
          return ids.length === 2 && ids[0] === 1 && ids[1] === 2;
        }
      ),
      { numRuns: 100 }
    );
  });
});
