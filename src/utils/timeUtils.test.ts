import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatDateTime, getRecentMonths, isInDateRange, getMonthRange } from './timeUtils';

describe('formatDateTime', () => {
  // **Feature: watcha-reviews-exporter, Property 4: 时间格式化一致性**
  // **Validates: Requirements 3.3**

  it('should format ISO dates to YYYY-MM-DD HH:mm format', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (date) => {
          const isoString = date.toISOString();
          const result = formatDateTime(isoString);
          // 结果应该匹配 YYYY-MM-DD HH:mm 格式
          return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(result);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve date components correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        (year, month, day, hour, minute) => {
          const date = new Date(year, month - 1, day, hour, minute);
          const isoString = date.toISOString();
          const result = formatDateTime(isoString);
          
          const [datePart, timePart] = result.split(' ');
          const [rYear, rMonth, rDay] = datePart.split('-').map(Number);
          const [rHour, rMinute] = timePart.split(':').map(Number);
          
          return rYear === year && rMonth === month && rDay === day &&
                 rHour === hour && rMinute === minute;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle invalid date strings', () => {
    expect(formatDateTime('invalid')).toBe('invalid');
    expect(formatDateTime('')).toBe('');
  });

  it('should format real watcha date correctly', () => {
    const result = formatDateTime('2025-11-29T09:59:40.159Z');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

describe('getRecentMonths', () => {
  // **Feature: watcha-reviews-exporter, Property 7: 月份选项生成正确性**
  // **Validates: Requirements 4.2**

  it('should generate correct number of months', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (count) => {
          const months = getRecentMonths(count);
          return months.length === count;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate months in correct order (most recent first)', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (referenceDate) => {
          const months = getRecentMonths(3, referenceDate);
          // 每个月份应该比下一个更近
          for (let i = 0; i < months.length - 1; i++) {
            if (months[i].start <= months[i + 1].start) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have correct month range boundaries', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (referenceDate) => {
          const months = getRecentMonths(3, referenceDate);
          return months.every(m => {
            // start 应该是月初 00:00:00
            const startOk = m.start.getDate() === 1 &&
                           m.start.getHours() === 0 &&
                           m.start.getMinutes() === 0;
            // end 应该是月末 23:59:59
            const endOk = m.end.getHours() === 23 &&
                         m.end.getMinutes() === 59;
            return startOk && endOk;
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should generate correct labels', () => {
    const refDate = new Date('2025-12-15');
    const months = getRecentMonths(3, refDate);
    expect(months[0].label).toBe('25年11月');
    expect(months[1].label).toBe('25年10月');
    expect(months[2].label).toBe('25年9月');
  });
});

describe('isInDateRange', () => {
  it('should correctly identify dates within range', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01'), noInvalidDate: true }),
        fc.date({ min: new Date('2025-01-02'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (start, end) => {
          // 生成一个在范围内的日期
          const midTime = start.getTime() + (end.getTime() - start.getTime()) / 2;
          const midDate = new Date(midTime);
          return isInDateRange(midDate.toISOString(), start, end) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly reject dates outside range', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');
    
    expect(isInDateRange('2024-12-31T23:59:59.999Z', start, end)).toBe(false);
    expect(isInDateRange('2025-02-01T00:00:00.000Z', start, end)).toBe(false);
  });

  it('should include boundary dates', () => {
    const start = new Date('2025-01-01T00:00:00.000Z');
    const end = new Date('2025-01-31T23:59:59.999Z');
    
    expect(isInDateRange('2025-01-01T00:00:00.000Z', start, end)).toBe(true);
    expect(isInDateRange('2025-01-31T23:59:59.999Z', start, end)).toBe(true);
  });
});

describe('getMonthRange', () => {
  it('should return correct range for any month', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        (year, month) => {
          const { start, end } = getMonthRange(year, month);
          
          // start 应该是该月1日
          const startOk = start.getFullYear() === year &&
                         start.getMonth() === month - 1 &&
                         start.getDate() === 1;
          
          // end 应该是该月最后一天
          const endOk = end.getFullYear() === year &&
                       end.getMonth() === month - 1 &&
                       end.getDate() === new Date(year, month, 0).getDate();
          
          return startOk && endOk;
        }
      ),
      { numRuns: 100 }
    );
  });
});
