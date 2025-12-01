import type { Review, Post } from '../types';
import { formatDateTime } from './timeUtils';

export interface FormattedReview {
  productName: string;
  updateTime: string;
  content: string;
}

export function formatReviewForExport(review: Review): string {
  const time = formatDateTime(review.rawUpdateAt);
  const content = review.content.replace(/\n/g, '\n    '); // 缩进多行内容
  return `【${review.productName}】\n时间：${time}\n内容：${content}`;
}

export function formatPostForExport(post: Post): string {
  const time = formatDateTime(post.rawUpdateAt);
  const content = post.content.replace(/\n/g, '\n    '); // 缩进多行内容
  return `【${post.title}】\n时间：${time}\n内容：${content}`;
}

export function formatReviewsForExport(reviews: Review[]): string {
  return reviews
    .map((review, index) => `${index + 1}. ${formatReviewForExport(review)}`)
    .join('\n\n' + '='.repeat(50) + '\n\n');
}

export function formatPostsForExport(posts: Post[]): string {
  return posts
    .map((post, index) => `${index + 1}. ${formatPostForExport(post)}`)
    .join('\n\n' + '='.repeat(50) + '\n\n');
}

export function exportToTxt(reviews: Review[], filename: string = '个人猹评.txt'): void {
  const content = formatReviewsForExport(reviews);
  const header = `猹评导出\n导出时间：${formatDateTime(new Date().toISOString())}\n共 ${reviews.length} 条猹评\n\n${'='.repeat(50)}\n\n`;
  const fullContent = header + content;

  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function exportPostsToTxt(posts: Post[], filename: string = '个人讨论.txt'): void {
  const content = formatPostsForExport(posts);
  const header = `讨论导出\n导出时间：${formatDateTime(new Date().toISOString())}\n共 ${posts.length} 条讨论\n\n${'='.repeat(50)}\n\n`;
  const fullContent = header + content;

  const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// 用于测试的纯函数
export function getExportContent(reviews: Review[]): string {
  const content = formatReviewsForExport(reviews);
  const header = `猹评导出\n导出时间：${formatDateTime(new Date().toISOString())}\n共 ${reviews.length} 条猹评\n\n${'='.repeat(50)}\n\n`;
  return header + content;
}
