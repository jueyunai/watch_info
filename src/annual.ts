import './annual.css';

import { parseWatchaUrl } from './utils/urlParser';
import { fetchUserInfo, fetchAllReviews, fetchAllPosts } from './services/api';
import { transformReviews, sortReviewsByDate, transformPosts, sortPostsByDate } from './utils/reviewProcessor';
import { analyzeAnnualData, generateLabels, formatWordCount, getMonthName } from './utils/annualAnalyzer';
import { generateLLMInput, ANNUAL_SYSTEM_PROMPT, ANNUAL_USER_PROMPT } from './utils/dataSummarizer';
import { mockAiContent } from './mock/aiResponse';
import { chat } from './services/llm';
import { getProviderPriority } from './config/llm';
import type { AnnualStats, AchievementLabel } from './types/annual';
import type { Review, Post } from './types';

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
const generateAiBtn = document.getElementById('generate-ai-btn') as HTMLButtonElement;

// DOM 元素 - AI 洞察
const aiLoading = document.getElementById('ai-loading') as HTMLDivElement;
const aiLoadingText = document.getElementById('ai-loading-text') as HTMLParagraphElement;
const aiContent = document.getElementById('ai-content') as HTMLDivElement;
const aiSection = document.getElementById('ai-insight-container')?.closest('.ai-section') as HTMLElement | null;

// DOM 元素 - 海报预览弹窗
const posterModal = document.getElementById('poster-modal') as HTMLDivElement;
const closePosterModal = document.getElementById('close-poster-modal') as HTMLButtonElement;
const posterImage = document.getElementById('poster-image') as HTMLImageElement;
const posterLoading = document.getElementById('poster-loading') as HTMLDivElement;
const downloadPosterConfirmBtn = document.getElementById('download-poster-confirm-btn') as HTMLButtonElement;
const posterBackBtn = document.getElementById('poster-back-btn') as HTMLButtonElement;

// DOM 元素 - 弹窗
const promptModal = document.getElementById('prompt-modal') as HTMLDivElement;
const closeModal = document.getElementById('close-modal') as HTMLButtonElement;
const promptText = document.getElementById('prompt-text') as HTMLPreElement;
const copyPromptBtn = document.getElementById('copy-prompt-btn') as HTMLButtonElement;
const copySuccess = document.getElementById('copy-success') as HTMLSpanElement;

// 应用状态
let currentNickname = '';
let currentUsername = '';
let currentStats: AnnualStats | null = null;
let currentReviews: Review[] = [];
let currentPosts: Post[] = [];
let posterDataUrl = '';
let currentProviderIndex = 0; // 当前使用的模型索引

// 数据缓存函数
function getDataCacheKey(username: string) {
    return `watcha-annual-data-${username}`;
}

function cacheUserData(username: string, data: { reviews: Review[]; posts: Post[] }) {
    try {
        localStorage.setItem(getDataCacheKey(username), JSON.stringify(data));
    } catch { /* ignore */ }
}

function loadCachedUserData(username: string): { reviews: Review[]; posts: Post[] } | null {
    try {
        const cached = localStorage.getItem(getDataCacheKey(username));
        if (!cached) return null;
        const data = JSON.parse(cached);
        // 恢复 Date 对象
        data.reviews = data.reviews.map((r: Review) => ({
            ...r,
            updateAt: new Date(r.updateAt),
        }));
        data.posts = data.posts.map((p: Post) => ({
            ...p,
            updateAt: new Date(p.updateAt),
        }));
        return data;
    } catch { return null; }
}


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
    const maxValue = Math.max(...monthlyTotal);
    const safeMax = Math.max(maxValue, 1);
    const maxIndex = maxValue > 0 ? monthlyTotal.indexOf(maxValue) : -1;

    const months = ['1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'];

    monthlyChart.innerHTML = months.map((month, index) => {
        const value = monthlyTotal[index];
        const height = (value / safeMax) * 150;
        const barClass = index === maxIndex ? 'bar bar-peak' : 'bar';
        return `
      <div class="chart-bar">
        <div class="${barClass}" style="height: ${height}px;" title="${value}条"></div>
        <span class="bar-label">${month}</span>
      </div>
    `;
    }).join('');
}

// 获取徽章等级
function getBadgeLevel(stats: AnnualStats): string {
    // Level 4: Legend (Top 1% or very high activity)
    if (stats.totalReviews >= 200 || stats.activeDays >= 200) {
        return 'legend';
    }
    // Level 3: Philosopher (Deep content)
    if (stats.totalReviews >= 50 || (stats.totalReviews > 5 && stats.totalWords / stats.totalReviews >= 500)) {
        return 'philosopher';
    }
    // Level 2: Analyst (Consistent activity)
    if (stats.totalReviews >= 10 || stats.activeDays >= 30) {
        return 'analyst';
    }
    // Level 1: Observer (Default)
    return 'observer';
}

// 渲染报告
function renderReport(nickname: string, stats: AnnualStats, labels: AchievementLabel[], reviews: Review[], posts: Post[]) {
    currentNickname = nickname;
    currentStats = stats;
    currentReviews = reviews;
    currentPosts = posts;

    // 重置 AI 洞察区域
    aiContent.innerHTML = '';
    generateAiBtn.classList.remove('hidden');
    generateAiBtn.disabled = false;

    // 更新档案编号
    const archiveId = document.getElementById('archive-id');
    if (archiveId) {
        archiveId.textContent = `WR-2025-${currentUsername}`;
    }

    // 用户信息
    userNickname.textContent = nickname;

    // 渲染徽章
    const badgeLevel = getBadgeLevel(stats);
    const coverSection = document.querySelector('.cover-section');
    const existingBadge = document.querySelector('.mascot-badge-img');
    const existingBubble = document.querySelector('.mascot-bubble');

    if (existingBadge) {
        existingBadge.remove();
    }

    // 如果存在旧的 bubble，隐藏它 (虽然 CSS 已经处理了 poster-mode 下隐藏，这里彻底一点)
    if (existingBubble) {
        existingBubble.classList.add('hidden');
    }

    const badgeImg = document.createElement('img');
    badgeImg.src = `/badges/badge_${badgeLevel}.png`;
    badgeImg.className = 'mascot-badge-img';
    badgeImg.alt = `Level: ${badgeLevel}`;
    badgeImg.title = `年度等级：${badgeLevel.charAt(0).toUpperCase() + badgeLevel.slice(1)}`;

    // 插入到 cover-section 中
    if (coverSection) {
        coverSection.appendChild(badgeImg);
    }

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

    // 尝试加载缓存的 AI 洞察
    loadCachedAIInsight();

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
    currentUsername = username;

    try {
        generateBtn.disabled = true;
        
        // 检查缓存
        const cachedData = loadCachedUserData(username);
        let allReviews: Review[];
        let allPosts: Post[];

        showLoading('正在获取用户信息...');
        const userInfo = await fetchUserInfo(username);

        if (cachedData) {
            console.log('[数据] 使用缓存数据');
            allReviews = cachedData.reviews;
            allPosts = cachedData.posts;
        } else {
            console.log('[数据] 请求 API 数据');

            // 获取猹评
            showLoading('正在获取猹评数据...');
            const reviewItems = await fetchAllReviews(userInfo.id, updateProgress);
            allReviews = sortReviewsByDate(transformReviews(reviewItems));

            // 获取讨论
            showLoading('正在获取讨论数据...');
            const postItems = await fetchAllPosts(userInfo.id, updateProgress);
            allPosts = sortPostsByDate(transformPosts(postItems));

            // 缓存数据
            cacheUserData(username, { reviews: allReviews, posts: allPosts });
        }

        // 分析数据
        showLoading('正在分析年度数据...');
        const stats = analyzeAnnualData(allReviews, allPosts, 2025);
        const labels = generateLabels(stats);

        hideLoading();

        // 渲染报告
        renderReport(userInfo.nickname || username, stats, labels, allReviews, allPosts);

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

function getAIInsightCacheKey() {
    return currentUsername ? `watcha-ai-insight-${currentUsername}` : '';
}

function loadCachedAIInsight() {
    const cacheKey = getAIInsightCacheKey();
    console.log('[AI缓存] key:', cacheKey);
    if (!cacheKey) return;
    try {
        const cached = localStorage.getItem(cacheKey);
        console.log('[AI缓存] 是否存在:', !!cached);
        if (cached) {
            aiContent.innerHTML = renderMarkdown(cached);
            generateAiBtn.classList.add('hidden');
            generateAiBtn.disabled = false;
        }
    } catch {
        // Ignore storage errors.
    }
}

function cacheAIInsight(content: string) {
    const cacheKey = getAIInsightCacheKey();
    console.log('[AI缓存] 保存, key:', cacheKey, 'content长度:', content.length);
    if (!cacheKey) return;
    try {
        localStorage.setItem(cacheKey, content);
        console.log('[AI缓存] 保存成功');
    } catch (e) {
        console.error('[AI缓存] 保存失败:', e);
    }
}

function clearAIInsightCache() {
    const cacheKey = getAIInsightCacheKey();
    if (!cacheKey) return;
    try {
        localStorage.removeItem(cacheKey);
    } catch {
        // Ignore storage errors.
    }
}

function ensureAIInsightReady(): boolean {
    if (!aiLoading.classList.contains('hidden')) {
        alert('AI 洞察正在生成，请稍后再分享。');
        aiSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    if (!aiContent.innerHTML.trim()) {
        alert('请先生成 AI 洞察，再分享海报。');
        aiSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    if (aiContent.querySelector('.ai-error')) {
        alert('AI 洞察生成失败，请重新生成后再分享。');
        aiSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
    }
    return true;
}

// 生成并预览海报
async function downloadPoster() {
    if (!ensureAIInsightReady()) return;
    const reportContainer = document.getElementById('report-container');
    if (!reportContainer || !posterModal) return;

    downloadPosterBtn.disabled = true;
    downloadPosterBtn.textContent = '正在生成...';
    posterDataUrl = '';
    posterImage.src = '';
    posterImage.classList.add('hidden');
    posterLoading.classList.remove('hidden');
    downloadPosterConfirmBtn.disabled = true;
    posterModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        // 动态加载 html2canvas
        const html2canvas = (await import('html2canvas')).default;
        document.body.classList.add('poster-mode');
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const backgroundColor = getComputedStyle(document.body).backgroundColor || '#ffffff';

        const canvas = await html2canvas(reportContainer, {
            backgroundColor,
            scale: 2,
            useCORS: true,
            logging: false,
        });

        posterDataUrl = canvas.toDataURL('image/png');
        posterImage.src = posterDataUrl;
        posterImage.classList.remove('hidden');
        downloadPosterConfirmBtn.disabled = false;

    } catch (error) {
        console.error('生成海报失败:', error);
        alert('生成海报失败，请稍后重试');
        closePosterPreview();
    } finally {
        document.body.classList.remove('poster-mode');
        posterLoading.classList.add('hidden');
        downloadPosterBtn.disabled = false;
        downloadPosterBtn.textContent = '分享海报';
    }
}

function closePosterPreview() {
    posterModal.classList.add('hidden');
    document.body.style.overflow = '';
    posterDataUrl = '';
    posterImage.src = '';
    posterImage.classList.add('hidden');
    posterLoading.classList.add('hidden');
    downloadPosterConfirmBtn.disabled = true;
}

function downloadPosterFromPreview() {
    if (!posterDataUrl) return;
    const link = document.createElement('a');
    link.download = `观猹2025年报_${currentNickname}.png`;
    link.href = posterDataUrl;
    link.click();
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

// 重新生成 AI 洞察（切换到下一个模型）
function refreshAIInsight() {
    clearAIInsightCache();
    // 切换到下一个模型
    const providers = getProviderPriority();
    currentProviderIndex = (currentProviderIndex + 1) % providers.length;
    console.log(`[AI] 切换模型: ${providers[currentProviderIndex]}`);
    generateAiBtn.classList.remove('hidden');
    generateAiBtn.disabled = false;
    generateAIInsight(true); // 强制刷新
}

// 生成 AI 洞察（forceRefresh=true 时强制重新请求）
async function generateAIInsight(forceRefresh = false) {
    if (!currentStats || currentReviews.length === 0) {
        alert('没有可分析的数据');
        return;
    }

    // 检查缓存（非强制刷新时）
    if (!forceRefresh) {
        const cacheKey = getAIInsightCacheKey();
        if (cacheKey) {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                console.log('[AI] 使用缓存数据');
                aiContent.innerHTML = renderMarkdown(cached);
                generateAiBtn.classList.add('hidden');
                return;
            }
        }
    }

    console.log('[AI] 请求 LLM API...');
    generateAiBtn.disabled = true;
    generateAiBtn.classList.add('hidden');
    aiLoading.classList.remove('hidden');
    aiContent.innerHTML = '';

    // 动态更新等待文案
    const loadingMessages = [
        'AI 正在分析你的年度数据...',
        '正在梳理你的认知轨迹...',
        '正在提炼年度洞察...',
        '快好了，再等一下...',
    ];
    let msgIndex = 0;
    const loadingInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % loadingMessages.length;
        aiLoadingText.textContent = loadingMessages[msgIndex];
    }, 3000);

    try {
        const isDev = import.meta.env.DEV;
        const useMock = isDev && import.meta.env.VITE_USE_MOCK === 'true';
        let content = '';

        if (useMock) {
            // 使用 mock 数据
            content = mockAiContent;
        } else if (isDev) {
            // 开发环境：使用指定模型调用
            const providers = getProviderPriority();
            const provider = providers[currentProviderIndex];
            console.log(`[AI] 使用模型: ${provider}`);
            
            const dataInput = generateLLMInput(currentNickname, currentStats, currentReviews, currentPosts, 2025);
            const response = await chat(
                [
                    { role: 'system', content: ANNUAL_SYSTEM_PROMPT },
                    { role: 'user', content: ANNUAL_USER_PROMPT(dataInput) },
                ],
                { maxTokens: 4096 },
                provider
            );
            content = response.content || response.reasoningContent || '';
        } else {
            // 生产环境：走后端代理（支持模型切换）
            const providers = getProviderPriority();
            const provider = providers[currentProviderIndex];
            console.log(`[AI] 生产环境使用模型: ${provider}`);
            
            const dataInput = generateLLMInput(currentNickname, currentStats, currentReviews, currentPosts, 2025);
            const response = await fetch('/api/llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider, // 指定使用的厂商
                    messages: [
                        { role: 'system', content: ANNUAL_SYSTEM_PROMPT },
                        { role: 'user', content: ANNUAL_USER_PROMPT(dataInput) },
                    ],
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'AI 生成失败');
            }

            const data = await response.json();
            console.log(`[AI] 实际使用厂商: ${data._provider || provider}`);
            content = data.choices?.[0]?.message?.content || '';
        }

        if (content) {
            aiContent.innerHTML = renderMarkdown(content);
            cacheAIInsight(content);
        } else {
            aiContent.innerHTML = '<p class="ai-error">AI 未返回有效内容</p>';
        }
    } catch (error) {
        console.error('AI 生成失败:', error);
        aiContent.innerHTML = `<p class="ai-error">生成失败: ${error instanceof Error ? error.message : '未知错误'}</p>`;
        generateAiBtn.classList.remove('hidden');
        generateAiBtn.disabled = false;
    } finally {
        clearInterval(loadingInterval);
        aiLoadingText.textContent = 'AI 正在分析你的年度数据...';
        aiLoading.classList.add('hidden');
    }
}

// 简单的 Markdown 渲染
function renderMarkdown(text: string): string {
    // 移除思考过程（<think>...</think> 或类似格式）
    text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    // 统一引号：先把所有引号变成统一格式，再成对替换
    // 第一步：所有左引号类型 → 临时标记 L，所有右引号类型 → 临时标记 R
    // 统一引号：所有双引号类型 → 中文双引号""（奇数左引号，偶数右引号）
    let quoteCount = 0;
    text = text.replace(/["""""「」]/g, () => {
        quoteCount++;
        return quoteCount % 2 === 1 ? '"' : '"';
    });
    
    const lines = text.split('\n');
    const html: string[] = [];
    let paragraph: string[] = [];
    let inList = false;

    const inline = (value: string) => value
        .replace(/`([^`]+?)`/g, '<code>$1</code>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');

    const flushParagraph = () => {
        if (!paragraph.length) return;
        html.push(`<p>${paragraph.join('<br>')}</p>`);
        paragraph = [];
    };

    const closeList = () => {
        if (!inList) return;
        html.push('</ul>');
        inList = false;
    };

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
            flushParagraph();
            closeList();
            continue;
        }

        if (/^#{1,3}\s+/.test(trimmed)) {
            flushParagraph();
            closeList();
            if (trimmed.startsWith('### ')) {
                html.push(`<h4>${inline(trimmed.slice(4))}</h4>`);
            } else if (trimmed.startsWith('## ')) {
                html.push(`<h3>${inline(trimmed.slice(3))}</h3>`);
            } else {
                html.push(`<h2>${inline(trimmed.slice(2))}</h2>`);
            }
            continue;
        }

        if (/^---+$/.test(trimmed)) {
            flushParagraph();
            closeList();
            html.push('<hr />');
            continue;
        }

        if (/^>\s+/.test(trimmed)) {
            flushParagraph();
            closeList();
            html.push(`<blockquote>${inline(trimmed.replace(/^>\s+/, ''))}</blockquote>`);
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            flushParagraph();
            if (!inList) {
                html.push('<ul>');
                inList = true;
            }
            html.push(`<li>${inline(trimmed.replace(/^[-*]\s+/, ''))}</li>`);
            continue;
        }

        paragraph.push(inline(trimmed));
    }

    flushParagraph();
    closeList();
    return html.join('');
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
backBtn.addEventListener('click', refreshAIInsight);
generateAiBtn.addEventListener('click', () => generateAIInsight());

closeModal.addEventListener('click', hidePromptModal);
copyPromptBtn.addEventListener('click', copyPromptToClipboard);
closePosterModal.addEventListener('click', closePosterPreview);
posterBackBtn.addEventListener('click', closePosterPreview);
downloadPosterConfirmBtn.addEventListener('click', downloadPosterFromPreview);

promptModal.addEventListener('click', (e) => {
    if (e.target === promptModal) {
        hidePromptModal();
    }
});

posterModal.addEventListener('click', (e) => {
    if (e.target === posterModal) {
        closePosterPreview();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !promptModal.classList.contains('hidden')) {
        hidePromptModal();
    }
    if (e.key === 'Escape' && !posterModal.classList.contains('hidden')) {
        closePosterPreview();
    }
});
