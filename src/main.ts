import './style.css';
import type { Review, MonthOption } from './types';
import { parseWatchaUrl } from './utils/urlParser';
import { fetchUserInfo, fetchAllReviews } from './services/api';
import { transformReviews, sortReviewsByDate, filterReviewsByMonth } from './utils/reviewProcessor';
import { formatDateTime, getRecentMonths } from './utils/timeUtils';
import { exportToTxt } from './utils/exporter';

// DOM 元素
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const fetchBtn = document.getElementById('fetch-btn') as HTMLButtonElement;
const errorMsg = document.getElementById('error-msg') as HTMLParagraphElement;
const loadingSection = document.getElementById('loading-section') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLParagraphElement;
const progressText = document.getElementById('progress-text') as HTMLParagraphElement;
const resultSection = document.getElementById('result-section') as HTMLElement;
const totalCount = document.getElementById('total-count') as HTMLSpanElement;
const filteredCount = document.getElementById('filtered-count') as HTMLSpanElement;
const monthFilter = document.getElementById('month-filter') as HTMLSelectElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const reviewsList = document.getElementById('reviews-list') as HTMLDivElement;

// 应用状态
let allReviews: Review[] = [];
let filteredReviews: Review[] = [];
let monthOptions: MonthOption[] = [];

// 初始化月份筛选选项
function initMonthFilter() {
  monthOptions = getRecentMonths(3);
  monthFilter.innerHTML = '<option value="">全部</option>';
  monthOptions.forEach((opt, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = opt.label;
    monthFilter.appendChild(option);
  });
}

// 显示错误
function showError(message: string) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
}

// 隐藏错误
function hideError() {
  errorMsg.classList.add('hidden');
}

// 显示加载状态
function showLoading(text: string = '正在获取数据...') {
  loadingText.textContent = text;
  progressText.textContent = '';
  loadingSection.classList.remove('hidden');
  resultSection.classList.add('hidden');
}

// 隐藏加载状态
function hideLoading() {
  loadingSection.classList.add('hidden');
}

// 更新进度
function updateProgress(loaded: number, total: number) {
  progressText.textContent = `已获取 ${loaded} / ${total} 条`;
}

// 渲染单条猹评
function renderReviewItem(review: Review): string {
  const time = formatDateTime(review.rawUpdateAt);
  const content = review.content.length > 500 
    ? review.content.slice(0, 500) + '...' 
    : review.content;
  
  return `
    <div class="review-item">
      <div class="review-header">
        <span class="product-name">${escapeHtml(review.productName)}</span>
        <span class="review-time">${time}</span>
      </div>
      <div class="review-content">${escapeHtml(content)}</div>
    </div>
  `;
}

// HTML 转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 渲染猹评列表
function renderReviews(reviews: Review[]) {
  reviewsList.innerHTML = reviews.map(renderReviewItem).join('');
}

// 更新统计信息
function updateStats() {
  totalCount.textContent = `共 ${allReviews.length} 条猹评`;
  if (filteredReviews.length !== allReviews.length) {
    filteredCount.textContent = `（筛选后 ${filteredReviews.length} 条）`;
  } else {
    filteredCount.textContent = '';
  }
}

// 应用筛选
function applyFilter() {
  const selectedIndex = monthFilter.value;
  
  if (selectedIndex === '') {
    filteredReviews = allReviews;
  } else {
    const opt = monthOptions[parseInt(selectedIndex)];
    filteredReviews = filterReviewsByMonth(allReviews, opt.year, opt.month);
  }
  
  updateStats();
  renderReviews(filteredReviews);
}

// 显示结果
function showResults() {
  resultSection.classList.remove('hidden');
  applyFilter();
}

// 获取猹评数据
async function fetchReviews() {
  const url = urlInput.value.trim();
  
  hideError();
  
  // 解析 URL
  const parseResult = parseWatchaUrl(url);
  if (!parseResult.success) {
    showError(parseResult.error || '请输入有效的观猹个人主页地址');
    return;
  }
  
  const username = parseResult.username!;
  
  try {
    fetchBtn.disabled = true;
    showLoading('正在获取用户信息...');
    
    // 获取用户信息
    const userInfo = await fetchUserInfo(username);
    
    showLoading('正在获取猹评数据...');
    
    // 获取所有猹评
    const reviewItems = await fetchAllReviews(userInfo.id, updateProgress);
    
    // 转换和排序
    allReviews = sortReviewsByDate(transformReviews(reviewItems));
    
    hideLoading();
    showResults();
    
  } catch (error) {
    hideLoading();
    if (error instanceof Error) {
      showError(error.message);
    } else {
      showError('获取数据失败，请稍后重试');
    }
  } finally {
    fetchBtn.disabled = false;
  }
}

// 导出猹评
function handleExport() {
  if (filteredReviews.length === 0) {
    showError('没有可导出的数据');
    return;
  }
  exportToTxt(filteredReviews);
}

// 事件绑定
fetchBtn.addEventListener('click', fetchReviews);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchReviews();
  }
});
monthFilter.addEventListener('change', applyFilter);
exportBtn.addEventListener('click', handleExport);

// 初始化
initMonthFilter();
