# 光体 · AI 网站开发设计平台

面向非专业用户的全栈建站平台。基于 **WorkBuddy** 与用户级技能 **awesome-design-md** 构建：先挑品牌风格与网站类型，再勾选后端能力，分步引导生成可直接预览的网站与后端配置文档。所有品牌、类型、接口数据均为真实落地内容，无占位。

## 核心能力

1. **品牌风格库** —— 74 个真实品牌卡片（品牌名、配色方案含色值、字体、视觉基调预览），支持关键词搜索，以及行业 / 色系 / 风格调性三维筛选。
2. **网站类型库** —— 100 种网站类型逐条完整列出（提示词模板、页面结构、核心模块、数据模型要点），覆盖企业官网、电商、作品集、SaaS、论坛、问答社区等 30 个大类。
3. **后端能力选配** —— 可勾选注册登录、权限与会员、积分、支付、订单、消息通知、内容管理后台、数据统计等模块，自动输出接口清单与数据表结构。
4. **分步引导流程** —— 品牌 → 网站类型 → 风格规范 → 后端模块 → 开发文档（文本输入或上传 .txt/.md/.json/.pdf/.doc/.docx），每步可回退修改。
5. **配置摘要面板** —— 汇总全部选择，一键生成可直接预览的网站 HTML 与后端配置 Markdown 文档（含下载）。
6. **参考入口** —— 网站提示词参考、设计提示词参考、图片提示词参考三个外链。
7. 响应式、简洁克制的界面，实时展示生成状态与进度。

## 本地使用

直接用浏览器打开 `index.html` 即可，无需任何构建步骤（数据已内联）。

```bash
# 直接用浏览器打开
open index.html        # macOS
# 或
start index.html       # Windows
```

## 重新构建（可选）

源码数据在 `*.json`，模板在 `template.html`，构建脚本把数据注入模板生成 `index.html`：

```bash
python build_app.py    # 重新编译 index.html
```

## 目录结构

```
guangti-platform/
├── index.html              # 平台主应用（自包含，数据内联）
├── template.html           # 应用模板（含注入占位）
├── brands.json             # 74 个品牌的设计 token 数据
├── types.json              # 100 种网站类型数据
├── backend.json            # 8 个后端模块（接口 + 数据表）数据
├── backend-config.md       # 后端配置说明文档（静态版）
├── parse_brands.py         # 从 awesome-design-md 解析品牌数据
├── build_types.py          # 生成 100 种类型数据
├── build_backend.py        # 生成后端模块数据
├── build_app.py            # 将数据注入模板编译 index.html
├── test_flow.js            # 主流程自动化测试（Node + DOM 桩）
└── test_idcheck.js         # DOM id 引用一致性检查
```

## 测试

```bash
node test_flow.js      # 覆盖：初始渲染、搜索/筛选、向导五步、后端选配、生成、异常分支
node test_idcheck.js   # 校验脚本引用的 DOM id 均在页面中存在
```

## 技术说明

- 纯静态单文件应用，零运行时依赖，可直接托管到任意静态服务器（GitHub Pages / EdgeOne / CloudStudio 等）。
- 品牌视觉规范来自用户级技能 `awesome-design-md`（VoltAgent 品牌设计系统库）。
- 生成网站时调用平台内置的设计规范（配色、字体、圆角）注入到新页面的 CSS 变量，保证风格一致。
