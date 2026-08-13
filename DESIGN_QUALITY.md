# 光体平台 · 设计质量规则层（Design Quality Layer）

> 本文件是「① 聚合并优化网站设计技能」的审计结论，也是「② 生成高质 HTML」的施工标准。
> 平台生成网站时，必须按本层产出：统一设计 token + 反 AI 套版护栏 + 真实文案 + 完整章节结构。

## 一、纳入的技能与各自职责

| 技能 | 角色 | 平台如何使用 |
|------|------|--------------|
| **awesome-design-md**（74 真实品牌） | 设计 DNA 来源 | 选定品牌的 colors/fonts/tone → 注入为设计 token（--p / --font-display 等）+ 视觉基调描述 |
| **ui-design-system**（Material3 / Apple HIG / Pinterest） | 设计系统基座 | 提供：Tonal 调色板结构、8pt 间距网格、Type Scale(clamp)、动效曲线、Card/Button/Input 规范、UI Generation Protocol 顺序 |
| **impeccable**（反 AI 套版） | 质量护栏 | 提供 DO/DON'T 守卫：独特展示字体+精致正文、oklch/color-mix、节奏化间距、指数缓动、容器查询、每词有其用；通过「AI Slop Test」 |
| **landing-page-generator** | 章节结构 + 技术要求 | 提供：Hero/Features/SocialProof/Pricing/FAQ/Footer 章节模板；响应式 3 断点、暗色模式、a11y、SEO(OG/JSON-LD)、性能、无 lorem 占位 |
| **ui-design**（cloudbase） | 反套版 · 设计规范前置 | 提供：①「先出设计规范（用途/美学方向/配色/字体/布局）再写码」；② 禁用 emoji 图标→必须用专业图标库（内联 SVG / FontAwesome）；③ 禁用紫蓝渐变 + Inter/Roboto/system-ui 展示字；④ 非对称/破网格/重叠布局；⑤ 真实图片（Unsplash/Pexels）；⑥ 入场动画用 `animation-delay` 错峰 |
| **frontend-design**（clawic） | 工程落地护栏 | 提供：① Mobile-first + 2x+ 字号跳跃；② 70-20-10 配色（主/次/强调）；③ 不用纯白底、要加深度（渐变/颗粒/噪点）；④ 每次交互 100ms 内反馈；⑤ 可访问性 4.5:1 + focus 环；⑥ 性能 LCP<2.5s / CLS<0.1；⑦ 每页一个"难忘元素" |
| **figma-to-html** | 语义化 & 资源规范 | 提供：① 严格语义（nav/main/section/article）；② 相对单位（%、vw、rem），固定 px 仅小元素；③ 图片走 `images/` 目录、alt+lazy；④ 响应式断点 ≤768 / ≤480；⑤ 间距/字体严格还原、视觉层级清晰 |

> **状态：以上 7 个技能已全部纳入生成链**（不再是"参考"）。平台 `buildSite()` 必须按本层 + 下方「三技能落地规则」产出。

## 二、统一设计 Token 系统（所有生成站点强制继承）

```css
:root{
  /* —— 色彩：由选定品牌注入，以下为兜底结构 —— */
  --p:        #6C63FF;   /* primary 品牌主色 */
  --p-ink:    #FFFFFF;   /* 主色上的文字 */
  --ink:      #16181D;   /* 主文字（非纯黑） */
  --ink-2:    #5B6170;   /* 次要文字 */
  --canvas:   #FFFFFF;   /* 背景 */
  --surface:  #F7F8FA;   /* 表面/分区 */
  --line:     #E7E9EE;   /* 描边 */
  --ok:       #2D6A4F;   /* 成功/强调 */

  /* —— 间距：8pt 网格 —— */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px; --s6:24px;
  --s8:32px; --s10:40px; --s12:48px; --s16:64px; --s24:96px;

  /* —— 字体：展示字体(独特)+正文(精致) —— */
  --font-display:'Space Grotesk','Syne',system-ui,sans-serif;
  --font-body:'Inter','Manrope',system-ui,"PingFang SC","Microsoft YaHei",sans-serif;

  /* —— 字号：clamp 流体 —— */
  --t-display:clamp(40px,5vw,64px);
  --t-h1:clamp(30px,4vw,46px);
  --t-h2:clamp(24px,3vw,34px);
  --t-h3:clamp(19px,2.4vw,24px);
  --t-body:16px; --t-small:14px;

  /* —— 圆角 —— */
  --r-card:16px; --r-btn:10px; --r-pill:999px;

  /* —— 动效曲线（指数缓动，非回弹） —— */
  --ease-out-quart:cubic-bezier(0.25,1,0.5,1);
  --ease-soft:cubic-bezier(0.4,0,0.2,1);
  --dur:280ms;
}
```

## 三、反 AI 套版护栏（impeccable 守卫，生成时必过）

- ✅ 主文字不用纯 `#000`/`#fff`（用 `--ink`/`--canvas` 中性色）。
- ✅ 配色不出现「青+深底发光」「紫蓝渐变+霓虹点」等典型 AI 色；以品牌主色为锚，中性色偏冷/暖统一。
- ✅ 展示字体必须独特（Space Grotesk / Syne / Playfair / Noto Serif SC 等），正文用 Inter/Manrope，禁止 Inter/Roboto/Arial 当展示。
- ✅ 间距有节奏变化（区块间 --s16~--s24，卡内 --s4~--s6），不全部均一。
- ✅ 动效只用 transform/opacity，缓动用 ease-out-quart/expo，**禁止回弹弹性缓动**。
- ✅ 用容器查询 `@container` / clamp 适配，不在移动端隐藏关键功能。
- ✅ 每个词都有存在价值（UX 文案），不重复可见信息。
- ❌ 禁止：彩虹渐变按钮、廉价 `0 4px 8px rgba(0,0,0,.5)` 阴影、全大写+粗体+红色的"重要提示"、同屏 >12 色、图标文字不对齐、点击区 <44px。

## 四、章节结构（landing-page-generator 模板，按类型裁剪）

| 章节 | 何时 | 内容 |
|------|------|------|
| Nav | 始终 | 吸顶、品牌名+锚点、主 CTA、移动端汉堡 |
| Hero | 始终 | h1=价值主张（非品牌名）、副文案、主 CTA、可选品牌色渐变背景 |
| Features | 始终 | 3–6 项网格，每项 icon+标题+短描述（语义 h2/h3） |
| Social Proof | 默认 | 2–3 评价卡 / 客户 logo 墙 |
| Pricing | 含「付费/会员/订阅」类型时 | 2–3 档，高亮推荐档 |
| FAQ | 默认 | details/summary 手风琴，4–6 问 |
| Footer | 始终 | 品牌名、联系方式、版权（JS 自动年） |

## 五、技术要求（所有生成站点强制）

- 响应式：Mobile-first，3 断点（<640 / 640+ / 1024+）。
- 暗色模式：`.dark` class + CSS 变量切换 + localStorage 持久；默认跟随系统。
- 可访问性：h1→h2→h3 不跳级；图片 alt；`:focus-visible` 焦点环；对比度 ≥4.5:1；skip-to-content 链接。
- SEO：语义标签；OG + Twitter Card + canonical + JSON-LD（LocalBusiness 或 Organization）。
- 性能：核心内容无 JS 亦可渲染；图片 `loading="lazy"`；单文件自包含。

## 六、真实文案规则（禁止 lorem）

- 文案基于 `type.name` / `type.category` / `brand.title` 生成，行业化、可读、无占位。
- 每类网站预置一套「章节标题 + 要点 + 评价 + FAQ」真实话术模板，按品牌语气（tone）微调口吻。

## 七、三技能落地规则（代码强制执行 · 平台生成器必过）

### ui-design 落地
- **设计规范前置**：`designSpec(b,t)` 在生成前先确定「美学方向 / 配色 / 字体 / 布局策略」，输出注入 token，不在代码里随手拍板。
- **图标 = 专业图标库**：所有模块/能力图标用内联 SVG（Heroicons 风格 stroke），**禁用 emoji 作图标**（✅ `✦` ❌ 🚀⭐）。`iconFor(label)` 按关键词映射 SVG。
- **禁用套版色/字**：不出现紫蓝渐变霓虹；展示字体用品牌真实字体（BinancePlex / Playfair / 思源等），fallback 不用 Inter/Roboto 当展示。
- **非对称 / 破网格**：Hero 用「左文 + 右视觉」两栏非对称；允许重叠、对角线、负空间控制。
- **真实图片**：Hero 视觉与配图优先真实图（见「八、图片资源」），非纯色块占位。
- **错峰入场**：首屏区块用 `animation-delay` 阶梯淡入，一个编排好的 load 动画 > 散点微交互。

### frontend-design 落地
- **70-20-10 配色**：主色 70% / 中性 20% / 强调 10%（用 `--p` / `--ink` / `--accent`）。
- **不用纯白底加深度**：页面底用 `--can`（非纯白）+ 分区 `--sft`；Hero/CTA 用品牌渐变或品牌艺术图，不用空白死板。
- **2x+ 字号跳跃**：h1≥clamp(34,5vw,56)、h2≥clamp(26,3.5vw,38)、正文 16-18px；标题字重 900。
- **交互反馈**：导航/卡片 hover 有 transform 过渡（≤280ms，ease-out-quart）；移动端汉堡菜单。
- **可访问性**：`:focus-visible` 焦点环；对比度 ≥4.5:1；语义标签；图片 alt；skip-link。
- **性能**：核心内容无 JS 可渲染；图片 `loading="lazy"` + 固定宽高防 CLS；单文件预览内联、导出多文件。
- **一个难忘元素**：每站点一个标志性视觉（超大品牌字 / 几何艺术图 / 胶囊 CTA / 毛玻璃吸顶）。

### figma-to-html 落地
- **语义结构**：`<nav><main><section><article><footer>`，可点卡片用 `<a>/<button>`。
- **相对单位**：间距/尺寸用 rem/%/vw；固定 px 仅图标、小间距。
- **图片目录**：导出多文件时图片落 `assets/img/`，HTML 用相对路径 `assets/img/xxx`（`images-*.svg`/`img-*.jpg`/`bg-*.svg`）。
- **响应式断点**：≤1024 收栏、≤768 单列、≤480 极端收缩；图片 `max-width:100%`。
- **视觉层级**：标题>正文>辅助，严格保留字号/字重差，不统一化。
- **导出清单**：`index.html` + `assets/css/style.css` + `assets/js/site.js` + `assets/img/*` + `README.md`（zip）。

## 八、图片资源接入（真实、可兜底、不破图）
- **真实图（优先）**：`IMG` 映射「网站大类 → Picsum 稳定种子图」`https://picsum.photos/seed/<seed>/<w>/<h>`，确定性、无 key、永远可加载。
- **品牌艺术图（兜底，永不破）**：`brandArt(b,variant)` 用品牌 swatches + tone 生成 SVG 渐变网格/几何，`data:image/svg+xml` 内联；任何真实图 `onerror` 回退到此。
- **用户上传（最真实）**：步骤⑤ 支持上传图片，存 dataURL 作 Hero 视觉；导出时写入 `assets/img/hero-upload.jpg`。
- 所有 `<img>`：必须 `alt` + `loading="lazy"` + `onerror="this.onerror=null;this.src='<brandArt>'"`，保证零破图。
