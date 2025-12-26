import './annual.css';

import { parseWatchaUrl } from './utils/urlParser';
import { fetchUserInfo, fetchAllReviews, fetchAllPosts } from './services/api';
import { transformReviews, sortReviewsByDate, transformPosts, sortPostsByDate } from './utils/reviewProcessor';
import { analyzeAnnualData, generateLabels, formatWordCount, getMonthName } from './utils/annualAnalyzer';
import type { AnnualStats, AchievementLabel } from './types/annual';

// DOM 元素 - 入口页
const urlInput = document.getElementById('url-input') as HTMLInputElement;
const generateBtn = document.getElementById('generate-btn') as HTMLButtonElement;
const errorMsg = document.getElementById('error-msg') as HTMLParagraphElement;
const loadingSection = document.getElementById('loading-section') as HTMLElement;
const loadingText = document.getElementById('loading-text') as HTMLParagraphElement;
const progressText = document.getElementById('progress-text') as HTMLParagraphElement;

// DOM 元素 - 页面
const entryPage = document.getElementById('entry-page') as HTMLDivElement;
const reportPage = document.getElementById('report-page') as HTMLDivElement;

// DOM 元素 - 报告页
const userNickname = document.getElementById('user-nickname') as HTMLSpanElement;
const labelsContainer = document.getElementById('labels-container') as HTMLDivElement;
const statReviews = document.getElementById('stat-reviews') as HTMLSpanElement;
const statPosts = document.getElementById('stat-posts') as HTMLSpanElement;
const statProducts = document.getElementById('stat-products') as HTMLSpanElement;
const statDays = document.getElementById('stat-days') as HTMLSpanElement;
const statWords = document.getElementById('stat-words') as HTMLSpanElement;
const statActiveMonth = document.getElementById('stat-active-month') as HTMLSpanElement;
const monthlyChart = document.getElementById('monthly-chart') as HTMLDivElement;

// DOM 元素 - 按钮
const downloadPosterBtn = document.getElementById('download-poster-btn') as HTMLButtonElement;
const showPromptBtn = document.getElementById('show-prompt-btn') as HTMLButtonElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;

// DOM 元素 - 弹窗
const promptModal = document.getElementById('prompt-modal') as HTMLDivElement;
const closeModal = document.getElementById('close-modal') as HTMLButtonElement;
const promptText = document.getElementById('prompt-text') as HTMLPreElement;
const copyPromptBtn = document.getElementById('copy-prompt-btn') as HTMLButtonElement;
const copySuccess = document.getElementById('copy-success') as HTMLSpanElement;

// 应用状态
let currentNickname = '';


// 年报配方提示词
const ANNUAL_PROMPT = `# 观猹AI洞察年报 2025

## 角色与背景
你是我的「年度认知审计师」，擅长从一整年的碎片化输出中，
提炼出思维演进的脉络、认知成长的轨迹、以及被忽视的盲区。

## 核心任务
请对我在观猹平台2025全年的猹评和讨论进行深度分析，
生成一份《观猹AI洞察年报 2025》。

你的目标是：
1. 穿透表面的「事件流水」，识别贯穿全年的认知母题
2. 追踪同一话题在不同时期的观点演变
3. 发现我自己都没意识到的思维模式和认知盲区
4. 为2026年提供战略级的方向建议

## 输出框架

### 📊 Part 1: 年度数据全景
- 输出总量统计（猹评数、讨论数、估算字数）
- 时间分布特征（高产期、低谷期、节奏规律）
- 一句话概括这一年的输出风格

### 🔥 Part 2: 年度关注力图谱
- 高频关键词 Top 10（区分频率和深度）
- 产品品类分布
- 情绪光谱分析（整体基调 + 情绪触发点）

### 🧠 Part 3: 认知演进轨迹
- 年度母题（1-3个贯穿全年的核心关注点）
- 观点迭代地图（同一话题的看法变化，标注时间节点）
- 认知增量清单（今年新建立的框架/方法论）

### ✨ Part 4: 年度金句与洞见
- 年度金句 Top 5（直接摘录 + 洞察点评）
- 预言验证（年初判断 vs 年末现实）
- 意外发现（被低估的洞察）

### 🕵️ Part 5: 盲区与反思
- 年度认知矛盾（前后观点冲突）
- 被遗忘的钻石（值得重新打捞的想法）
- 思维定势警示（反复出现的认知偏见）

### 🚀 Part 6: 2026展望
- 三个值得深挖的方向
- 一个「危险」的问题（直击舒适区）
- 年度关键词预测

## 分析协议
1. **时间敏感**：注意观点的时间戳，追踪演变而非静态归纳
2. **跨月关联**：寻找不同月份之间的呼应和矛盾
3. **深度优先**：长评权重高于短评，深度讨论权重高于随手吐槽
4. **反直觉检查**：如果结论太显而易见，继续挖掘更隐蔽的联系

## 沟通规则
1. **拒绝流水账**：不要「1月你关注了A，2月你关注了B」
2. **镜像原则**：忠实反馈盲区，不讨好
3. **审慎归纳**：涉及心理推断时，使用「数据暗示...」等客观表述
4. **仪式感**：这是年度报告，语言可以稍微郑重一些

请基于以上框架，开始分析我的2025年度数据。`;

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
}

// 隐藏加载状态
function hideLoading() {
    loadingSection.classList.add('hidden');
}

// 更新进度
function updateProgress(loaded: number, total: number) {
    progressText.textContent = `已获取 ${loaded} / ${total} 条`;
}

// 渲染成就标签
function renderLabels(labels: AchievementLabel[]) {
    labelsContainer.innerHTML = labels.map(label => `
    <span class="label-badge" title="${label.description}">
      ${label.emoji} ${label.title}
    </span>
  `).join('');
}

// 渲染月度图表
function renderMonthlyChart(stats: AnnualStats) {
    const monthlyTotal = stats.monthlyReviews.map((r, i) => r + stats.monthlyPosts[i]);
    const maxValue = Math.max(...monthlyTotal, 1);

    const months = ['1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'];

    monthlyChart.innerHTML = months.map((month, index) => {
        const value = monthlyTotal[index];
        const height = (value / maxValue) * 150;
        return `
      <div class="chart-bar">
        <div class="bar" style="height: ${height}px;" title="${value}条"></div>
        <span class="bar-label">${month}</span>
      </div>
    `;
    }).join('');
}

// 渲染报告
function renderReport(nickname: string, stats: AnnualStats, labels: AchievementLabel[]) {
    currentNickname = nickname;


    // 用户信息
    userNickname.textContent = nickname;

    // 成就标签
    renderLabels(labels);

    // 数据统计
    statReviews.textContent = stats.totalReviews.toString();
    statPosts.textContent = stats.totalPosts.toString();
    statProducts.textContent = stats.totalProducts.toString();
    statDays.textContent = stats.activeDays.toString();
    statWords.textContent = formatWordCount(stats.totalWords);
    statActiveMonth.textContent = getMonthName(stats.mostActiveMonth);

    // 月度图表
    renderMonthlyChart(stats);

    // 切换页面
    entryPage.classList.add('hidden');
    reportPage.classList.remove('hidden');
}

// 生成报告
async function generateReport() {
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
        generateBtn.disabled = true;
        showLoading('正在获取用户信息...');

        // 获取用户信息
        const userInfo = await fetchUserInfo(username);

        // 获取猹评
        showLoading('正在获取猹评数据...');
        const reviewItems = await fetchAllReviews(userInfo.id, updateProgress);
        const allReviews = sortReviewsByDate(transformReviews(reviewItems));

        // 获取讨论
        showLoading('正在获取讨论数据...');
        const postItems = await fetchAllPosts(userInfo.id, updateProgress);
        const allPosts = sortPostsByDate(transformPosts(postItems));

        // 分析数据
        showLoading('正在分析年度数据...');
        const stats = analyzeAnnualData(allReviews, allPosts, 2025);
        const labels = generateLabels(stats);

        hideLoading();

        // 渲染报告
        renderReport(userInfo.nickname || username, stats, labels);

    } catch (error) {
        hideLoading();
        if (error instanceof Error) {
            showError(error.message);
        } else {
            showError('获取数据失败，请稍后重试');
        }
    } finally {
        generateBtn.disabled = false;
    }
}

// 下载海报
async function downloadPoster() {
    const reportContainer = document.getElementById('report-container');
    if (!reportContainer) return;

    downloadPosterBtn.disabled = true;
    downloadPosterBtn.textContent = '正在生成...';

    try {
        // 动态加载 html2canvas
        const html2canvas = (await import('html2canvas')).default;

        const canvas = await html2canvas(reportContainer, {
            backgroundColor: '#0F1419',
            scale: 2,
            useCORS: true,
            logging: false,
        });

        // 创建下载链接
        const link = document.createElement('a');
        link.download = `观猹2025年报_${currentNickname}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

    } catch (error) {
        console.error('生成海报失败:', error);
        alert('生成海报失败，请稍后重试');
    } finally {
        downloadPosterBtn.disabled = false;
        downloadPosterBtn.textContent = '📥 下载海报';
    }
}

// 显示年报配方弹窗
function showPromptModal() {
    promptText.textContent = ANNUAL_PROMPT;
    promptModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// 隐藏弹窗
function hidePromptModal() {
    promptModal.classList.add('hidden');
    document.body.style.overflow = '';
    copySuccess.classList.add('hidden');
}

// 复制提示词
async function copyPromptToClipboard() {
    try {
        await navigator.clipboard.writeText(ANNUAL_PROMPT);
        copySuccess.classList.remove('hidden');
        setTimeout(() => {
            copySuccess.classList.add('hidden');
        }, 2000);
    } catch (error) {
        console.error('复制失败:', error);
        alert('复制失败，请手动选择文本复制');
    }
}

// 返回入口页
function goBack() {
    reportPage.classList.add('hidden');
    entryPage.classList.remove('hidden');
}

// 事件绑定
generateBtn.addEventListener('click', generateReport);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        generateReport();
    }
});

downloadPosterBtn.addEventListener('click', downloadPoster);
showPromptBtn.addEventListener('click', showPromptModal);
backBtn.addEventListener('click', goBack);

closeModal.addEventListener('click', hidePromptModal);
copyPromptBtn.addEventListener('click', copyPromptToClipboard);

promptModal.addEventListener('click', (e) => {
    if (e.target === promptModal) {
        hidePromptModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !promptModal.classList.contains('hidden')) {
        hidePromptModal();
    }
});
