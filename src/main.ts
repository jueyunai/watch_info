import './style.css';
import type { Review, Post, MonthOption } from './types';
import { parseWatchaUrl } from './utils/urlParser';
import { fetchUserInfo, fetchAllReviews, fetchAllPosts } from './services/api';
import { transformReviews, sortReviewsByDate, filterReviewsByMonth, transformPosts, sortPostsByDate, filterPostsByMonth } from './utils/reviewProcessor';
import { formatDateTime, getRecentMonths } from './utils/timeUtils';
import { exportToTxt, exportPostsToTxt } from './utils/exporter';

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
const dataList = document.getElementById('data-list') as HTMLDivElement;
const promptBtn = document.getElementById('prompt-btn') as HTMLButtonElement;
const promptModal = document.getElementById('prompt-modal') as HTMLDivElement;
const closeModal = document.getElementById('close-modal') as HTMLButtonElement;
const promptText = document.getElementById('prompt-text') as HTMLPreElement;
const copyPromptBtn = document.getElementById('copy-prompt-btn') as HTMLButtonElement;
const copySuccess = document.getElementById('copy-success') as HTMLSpanElement;

// 应用状态
let currentDataType: 'reviews' | 'posts' = 'reviews';
let currentUsername: string = '';
let allReviews: Review[] = [];
let filteredReviews: Review[] = [];
let allPosts: Post[] = [];
let filteredPosts: Post[] = [];
let monthOptions: MonthOption[] = [];

// 缓存相关
const CACHE_PREFIX = 'watcha_cache_';

function getCacheKey(username: string, type: 'reviews' | 'posts'): string {
  return `${CACHE_PREFIX}${username}_${type}`;
}

function saveToCache(username: string, type: 'reviews' | 'posts', data: Review[] | Post[]) {
  const key = getCacheKey(username, type);
  localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
}

function loadFromCache(username: string, type: 'reviews' | 'posts'): Review[] | Post[] | null {
  const key = getCacheKey(username, type);
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const { data } = JSON.parse(cached);
      return data;
    } catch {
      return null;
    }
  }
  return null;
}

function hasCache(username: string, type: 'reviews' | 'posts'): boolean {
  return localStorage.getItem(getCacheKey(username, type)) !== null;
}

function updateFetchBtnText() {
  const url = urlInput.value.trim();
  const parseResult = parseWatchaUrl(url);
  if (parseResult.success && parseResult.username) {
    const dataTypeRadio = document.querySelector('input[name="data-type"]:checked') as HTMLInputElement;
    const type = dataTypeRadio.value as 'reviews' | 'posts';
    fetchBtn.textContent = hasCache(parseResult.username, type) ? '更新数据' : '获取数据';
  } else {
    fetchBtn.textContent = '获取数据';
  }
}

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

// 渲染单条讨论
function renderPostItem(post: Post): string {
  const time = formatDateTime(post.rawUpdateAt);
  const content = post.content.length > 500 
    ? post.content.slice(0, 500) + '...' 
    : post.content;
  
  return `
    <div class="post-item">
      <div class="post-header">
        <span class="post-title">${escapeHtml(post.title)}</span>
        <span class="post-time">${time}</span>
      </div>
      <div class="post-content">${escapeHtml(content)}</div>
    </div>
  `;
}

// HTML 转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 渲染数据列表
function renderData() {
  if (currentDataType === 'reviews') {
    dataList.innerHTML = filteredReviews.map(renderReviewItem).join('');
  } else {
    dataList.innerHTML = filteredPosts.map(renderPostItem).join('');
  }
}

// 更新统计信息
function updateStats() {
  if (currentDataType === 'reviews') {
    totalCount.textContent = `共 ${allReviews.length} 条猹评`;
    if (filteredReviews.length !== allReviews.length) {
      filteredCount.textContent = `（筛选后 ${filteredReviews.length} 条）`;
    } else {
      filteredCount.textContent = '';
    }
  } else {
    totalCount.textContent = `共 ${allPosts.length} 条讨论`;
    if (filteredPosts.length !== allPosts.length) {
      filteredCount.textContent = `（筛选后 ${filteredPosts.length} 条）`;
    } else {
      filteredCount.textContent = '';
    }
  }
}

// 应用筛选
function applyFilter() {
  const selectedIndex = monthFilter.value;
  
  if (currentDataType === 'reviews') {
    if (selectedIndex === '') {
      filteredReviews = allReviews;
    } else {
      const opt = monthOptions[parseInt(selectedIndex)];
      filteredReviews = filterReviewsByMonth(allReviews, opt.year, opt.month);
    }
  } else {
    if (selectedIndex === '') {
      filteredPosts = allPosts;
    } else {
      const opt = monthOptions[parseInt(selectedIndex)];
      filteredPosts = filterPostsByMonth(allPosts, opt.year, opt.month);
    }
  }
  
  updateStats();
  renderData();
}

// 显示结果
function showResults() {
  resultSection.classList.remove('hidden');
  applyFilter();
}

// 获取数据
async function fetchData() {
  const url = urlInput.value.trim();
  
  hideError();
  
  // 获取选中的数据类型
  const dataTypeRadio = document.querySelector('input[name="data-type"]:checked') as HTMLInputElement;
  currentDataType = dataTypeRadio.value as 'reviews' | 'posts';
  
  // 解析 URL
  const parseResult = parseWatchaUrl(url);
  if (!parseResult.success) {
    showError(parseResult.error || '请输入有效的观猹个人主页地址');
    return;
  }
  
  const username = parseResult.username!;
  currentUsername = username;
  
  try {
    fetchBtn.disabled = true;
    showLoading('正在获取用户信息...');
    
    // 获取用户信息
    const userInfo = await fetchUserInfo(username);
    
    if (currentDataType === 'reviews') {
      showLoading('正在获取猹评数据...');
      const reviewItems = await fetchAllReviews(userInfo.id, updateProgress);
      allReviews = sortReviewsByDate(transformReviews(reviewItems));
      saveToCache(username, 'reviews', allReviews);
    } else {
      showLoading('正在获取讨论数据...');
      const postItems = await fetchAllPosts(userInfo.id, updateProgress);
      allPosts = sortPostsByDate(transformPosts(postItems));
      saveToCache(username, 'posts', allPosts);
    }
    
    hideLoading();
    showResults();
    updateFetchBtnText();
    
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

// 切换数据类型时加载缓存
function handleDataTypeChange() {
  const dataTypeRadio = document.querySelector('input[name="data-type"]:checked') as HTMLInputElement;
  currentDataType = dataTypeRadio.value as 'reviews' | 'posts';
  
  updateFetchBtnText();
  
  // 尝试从URL获取用户名
  const url = urlInput.value.trim();
  const parseResult = parseWatchaUrl(url);
  if (!parseResult.success || !parseResult.username) return;
  
  const username = parseResult.username;
  currentUsername = username;
  
  // 尝试加载缓存
  const cached = loadFromCache(username, currentDataType);
  if (cached) {
    if (currentDataType === 'reviews') {
      allReviews = cached as Review[];
    } else {
      allPosts = cached as Post[];
    }
    showResults();
  } else {
    // 无缓存时隐藏结果区
    resultSection.classList.add('hidden');
  }
}

// 导出数据
function handleExport() {
  if (currentDataType === 'reviews') {
    if (filteredReviews.length === 0) {
      showError('没有可导出的数据');
      return;
    }
    exportToTxt(filteredReviews);
  } else {
    if (filteredPosts.length === 0) {
      showError('没有可导出的数据');
      return;
    }
    exportPostsToTxt(filteredPosts);
  }
}

// 月报配方提示词
const PROMPT_TEMPLATE = `观猹AI洞察月报

// 鸣谢：一泽Eze & gemini

# 角色与背景
你并非一个普通的秘书，而是我的**"首席认知官"与"智力镜像"**。
你擅长处理我在观猹过去一个月内输出的产品评论、碎片化想法及社群讨论记录。这些文本是未经加工的"思想矿石"，往往夹杂着噪音、情绪与非结构化的灵感。

# 核心任务
请对提供的对话记录进行清洗、重组与深度分析，生成一份《观猹AI洞察月报》。
你的目标是**穿透表面的"事件"，通过分析我的关注点、情绪起伏和提问方式，揭示我本月的思维模型与认知偏好，并为下一阶段提供战略级建议。**

# 输出框架
请严格按照以下模块输出，语言风格需**犀利、客观、凝练**：

---

#### 📊 能量热力图 (新增)
- **关注力分配**：我本月在哪些领域/话题上花费了最多的笔墨和情绪能量？（不仅仅是频率，更看重讨论的深度与激烈程度）
- **情绪光谱**：整体基调是兴奋、焦虑、批判还是困惑？哪一个话题激发了我最强烈的情绪反应？

#### 🧠 智力焦点与成果
- **核心议题**：高度概括本月我反复通过不同角度切入的1-2个母题。
- **认知增量**：相比上个月（或常识），我在这些议题上构建了什么新的解释框架或结论？

#### ✨ 关键洞见 ("Aha Moments")
- 提取 1-3 个最具穿透力的观点。
- **引用要求**：直接摘录原话中的"金句"，并用一句话点评其背后的洞察价值。

#### 🕵️ 盲区、矛盾与深层阻碍 (优化)
- **认知矛盾**：我在本月的讨论中，是否存在前后观点不一致，或者"所想"与"所做"背道而驰的现象？
- **深层模式**：透过具体问题，你观察到我是否存在某种思维定势（如：过于纠结细节、因追求完美而停滞、对某类技术盲目乐观等）？
- **被遗落的钻石**：有没有哪个极具潜力的想法或线索，被我顺口一提后就匆匆略过，值得被重新打捞？

#### 🚀 下月导航系统
- **一个值得验证的假设**：基于本月观察，通过什么具体的行动或实验，能打破目前的认知瓶颈？
- **一个"危险"的问题**：提出一个可能让我感到轻微不适但必须面对的问题，直击我当前的认知舒适区。

---

# 思考协议（Chain of Thought）
在生成报告前，请执行以下思维步骤：
1. **降噪**：过滤掉社交寒暄、重复的无意义语气词。
2. **聚类**：将碎片化信息按"产品观"、"行业趋势"、"个人成长"等维度归类。
3. **归因**：不要只看我说了什么，要推演我"为什么"在这个时间点关注这个（是市场驱动、焦虑驱动还是好奇心驱动？）。
4. **反直觉检查**：如果结论太显而易见，请抛弃它，寻找更隐蔽的联系。

# 沟通规则
1. **拒绝平庸**：严禁使用"你讨论了A产品，觉得不错"这种流水账。我要的是"你通过A产品，试图探索XX边界"。
2. **镜像原则**：做我的镜子，忠实反馈我的盲区，不要试图讨好我。
3. **审慎归纳**：涉及对我心理状态或深层动机的推断时，请使用"数据暗示……"、"似乎表现出……"等客观描述，避免上帝视角。

请基于以上指令，开始分析。`;

// 显示月报配方弹窗
function showPromptModal() {
  promptText.textContent = PROMPT_TEMPLATE;
  promptModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// 隐藏月报配方弹窗
function hidePromptModal() {
  promptModal.classList.add('hidden');
  document.body.style.overflow = '';
  copySuccess.classList.add('hidden');
}

// 复制提示词到剪贴板
async function copyPromptToClipboard() {
  try {
    await navigator.clipboard.writeText(PROMPT_TEMPLATE);
    copySuccess.classList.remove('hidden');
    setTimeout(() => {
      copySuccess.classList.add('hidden');
    }, 2000);
  } catch (error) {
    console.error('复制失败:', error);
    showError('复制失败，请手动选择文本复制');
  }
}

// 事件绑定
fetchBtn.addEventListener('click', fetchData);
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    fetchData();
  }
});
urlInput.addEventListener('input', updateFetchBtnText);
monthFilter.addEventListener('change', applyFilter);
exportBtn.addEventListener('click', handleExport);

// 数据类型切换
document.querySelectorAll('input[name="data-type"]').forEach(radio => {
  radio.addEventListener('change', handleDataTypeChange);
});
promptBtn.addEventListener('click', showPromptModal);
closeModal.addEventListener('click', hidePromptModal);
copyPromptBtn.addEventListener('click', copyPromptToClipboard);

// 点击弹窗外部关闭
promptModal.addEventListener('click', (e) => {
  if (e.target === promptModal) {
    hidePromptModal();
  }
});

// ESC键关闭弹窗
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !promptModal.classList.contains('hidden')) {
    hidePromptModal();
  }
});

// 初始化
initMonthFilter();
