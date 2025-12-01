import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldContinuePaging } from './api';

describe('shouldContinuePaging', () => {
  // **Feature: watcha-reviews-exporter, Property 2: 分页逻辑正确性**
  // **Validates: Requirements 2.2, 2.3**

  it('should continue paging when items count equals limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (limit) => {
          return shouldContinuePaging(limit, limit) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should continue paging when items count exceeds limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 50 }),
        (limit, extra) => {
          return shouldContinuePaging(limit + extra, limit) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should stop paging when items count is less than limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 0, max: 99 }),
        (limit, itemsCount) => {
          if (itemsCount >= limit) return true; // skip invalid cases
          return shouldContinuePaging(itemsCount, limit) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should stop paging when items count is zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (limit) => {
          return shouldContinuePaging(0, limit) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle typical page size of 20', () => {
    expect(shouldContinuePaging(20, 20)).toBe(true);
    expect(shouldContinuePaging(19, 20)).toBe(false);
    expect(shouldContinuePaging(0, 20)).toBe(false);
    expect(shouldContinuePaging(15, 20)).toBe(false);
  });
});
