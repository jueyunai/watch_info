import type { MonthOption } from '../types';

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return isoString;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getRecentMonths(count: number = 3, referenceDate: Date = new Date()): MonthOption[] {
  const months: MonthOption[] = [];
  
  for (let i = 1; i <= count; i++) {
    const date = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    const shortYear = String(year).slice(2);
    const label = `${shortYear}年${month + 1}月`;
    
    months.push({
      label,
      year,
      month: month + 1, // 1-indexed for display
      start,
      end,
    });
  }
  
  return months;
}

export function isInDateRange(dateString: string, start: Date, end: Date): boolean {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false;
  }
  return date >= start && date <= end;
}

export function getMonthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}
