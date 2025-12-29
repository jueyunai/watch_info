# Texture Enhancement Plan for Annual V4 Page

## 1. 现状主要问题 (Visual Diagnosis)

1.  **材质平淡 (Flat Materiality)**: 页面使用了“纸张色” (`#f6f8f7`)，但缺乏真实的纸张纹理（如颗粒感、粗糙度），导致更像是一个常见的 Web 界面而非“年度档案”。
2.  **光影单一 (Flat Lighting)**: 阴影 (`box-shadow`) 过于均匀且单一，缺乏光源的方向感，导致元素缺乏层级和悬浮感。
3.  **缺乏动态 (Static Experience)**: 页面完全静止，缺乏进入时的仪式感（如盖章动画、纸张展开效果）。
4.  **排版层级 (Typography Hierarchy)**: 字体较细，关键数据（数字）与标签的对比度不够强烈，缺乏杂志排版的张力。
5.  **细节缺失 (Missing Details)**: 缺少像“折痕”、“金属夹子”、“防伪底纹”等能暗示“实体档案”的装饰性细节。

## 2. 设计理念 (Design Concept)

**核心主题**: "The Lab Archive" (实验室机密档案)
**关键词**: 
- **Tactile (触感)**: 毛玻璃 + 噪点纹理，模拟高级特种纸。
- **Luminous (微光)**: 强调“边缘光”和“漫反射”，模拟光线照射在纸张边缘的效果。
- **Cinematic (电影感)**: 更加戏剧化的阴影和入场动画。

## 3. 具体执行方案 (Action Items)

### A. 材质与背景 (Material & Background) [CSS]
1.  **添加全局噪点 (Global Noise)**: 使用 CSS `background-image: url('data:image/svg+xml...')` 或 CSS noise pattern 叠加一层 3% 透明度的噪点，打破纯色的平滑感。
2.  **毛玻璃卡片 (Frosted Glass)**: 
    -   将 `.hero-panel`, `.input-section` 等卡片的背景改为半透明白色 (`rgba(255, 255, 255, 0.7)`)。
    -   添加 `backdrop-filter: blur(20px)`。
    -   添加 1px 的亮色内描边 (`border-top: 1px solid rgba(255,255,255,0.8)`) 来模拟玻璃/厚纸板的厚度。

### B. 光影升级 (Lighting Upgrade) [CSS]
1.  **多层阴影 (Layered Shadows)**: 替换现有的单一阴影，使用三层阴影模拟环境光遮蔽 (Ambient Light) + 直射阴影 (Key Light)。
    ```css
    --shadow-premium: 
        0 1px 2px rgba(0,0,0,0.02), 
        0 8px 16px rgba(18, 24, 20, 0.04),
        0 24px 40px rgba(18, 24, 20, 0.06);
    ```
2.  **内发光 (Inner Glow)**: 给卡片添加微妙的白色内发光 `box-shadow: inset 0 0 40px rgba(255,255,255,0.5)`，使卡片中心看起来更通透。

### C. 装饰细节 (Decorative Elements) [HTML/CSS]
1.  **“2025” 盖章 (Digital Stamp)**: 在左上角或右下角添加一个 SVG 或 CSS 绘制的圆形印章，带有 `"CONFIDENTIAL"` 或 `"ARCHIVED"` 字样，并带有轻微的旋转角度。
2.  **网格背景 (Grid Pattern)**: 在 Body 背景叠加极淡的 20px x 20px 网格线，增强“工程/数据”的严谨感。
3.  **微金属质感 (Metallic Accents)**: 按钮或重要徽章通过 `linear-gradient` 模拟哑光金属的光泽（如哑光铝或磨砂金）。

### D. 动效体验 (Motion & Interaction) [CSS/JS]
1.  **入场动画 (Entrance)**:
    -   Body 加载时，卡片依次向上浮动并淡入 (`staggered fade-up`)。
    -   印章执行“盖下”的缩放动画 (`scale-in` with simple bounce)。
2.  **Hover 反馈**:
    -   Hover 输入框时，边框颜色平滑过渡，并增加阴影扩散。
    -   Hover 按钮时，按钮内部流光扫过。

## 4. 预期效果验证 (Success Metrics)

-   **截图对比**: 新旧页面并排对比，新版应看起来更“厚实”、更有层次。
-   **光标交互**: 鼠标滑过元素时应有细腻的反馈，不再是生硬的变色。
