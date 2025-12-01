import type { ReviewItem, Review } from '../types';
import { extractPlainText } from './contentParser';

export function transformReview(item: ReviewItem): Review {
  return {
    id: item.id,
    productName: item.product?.name || '未知产品',
    updateAt: new Date(item.update_at),
    content: extractPlainText(item.content),
    rawUpdateAt: item.update_at,
  };
}

export function transformReviews(items: ReviewItem[]): Review[] {
  return items.map(transformReview);
}

export function sortReviewsByDate(reviews: Review[], descending: boolean = true): Review[] {
  return [...reviews].sort((a, b) => {
    const diff = a.updateAt.getTime() - b.updateAt.getTime();
    return descending ? -diff : diff;
  });
}

export function filterReviewsByDateRange(
  reviews: Review[],
  startDate: Date,
  endDate: Date
): Review[] {
  return reviews.filter(review => {
    const time = review.updateAt.getTime();
    return time >= startDate.getTime() && time <= endDate.getTime();
  });
}

export function filterReviewsByMonth(
  reviews: Review[],
  year: number,
  month: number
): Review[] {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  return filterReviewsByDateRange(reviews, startDate, endDate);
}
