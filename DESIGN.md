---
name: uhyc
description: AI 媒体生成创作工坊 — 新粗野主义界面，柔和色块点缀，触觉式交互
colors:
  primary: "#cba0ff"
  secondary: "#ffaef3"
  tertiary: "#93ecff"
  neutral-bg: "#f4f3ec"
  neutral-paper: "#ffffff"
  neutral-ink: "#0a0a0a"
  neutral-muted: "#6b7280"
  neutral-muted-strong: "#334155"
  semantic-danger: "#ff5a5f"
  accent-purple-soft: "#ebdbff"
  accent-pink-soft: "#ffdee0"
  accent-red-soft: "#ffe6e7"
typography:
  display:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "24px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "10px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.neutral-ink}"
    textColor: "{colors.neutral-paper}"
    rounded: "{rounded.md}"
    padding: "13px 16px"
  button-accent:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    padding: "13px 16px"
  button-ghost:
    backgroundColor: "{colors.neutral-paper}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    padding: "13px 16px"
  card:
    backgroundColor: "{colors.neutral-paper}"
    rounded: "{rounded.lg}"
  input:
    backgroundColor: "{colors.neutral-paper}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  chip:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-ink}"
    rounded: "6px"
---

# Design System: uhyc

## 1. Overview

**Creative North Star: "创作工坊" (The Creative Workshop)**

uhyc 的界面是一个明亮的数字创作工坊。想象一张铺着网格纸的工作台：墨色工具轮廓分明，薰衣草紫、樱花粉、薄荷青的颜料块散落其间，每件工具拿起来都有实在的分量。这不是一个冷峻的实验室，也不是一个花哨的画廊 — 它是一个让人想动手操作的空间。

设计语言源于新粗野主义（Neo-Brutalism）但用柔和的东亚色感做了驯化。2px 实心黑边框和硬偏移阴影提供结构和触觉反馈；柔色块作为强调色注入温度和趣味，而不是刺眼的霓虹。Inter 字体作为唯一的字体选择，避免了字体间的竞争，让层次完全通过粗细和大小来表达。

这个系统明确拒绝：暗黑终端美学、SaaS 蓝色模板、过度极简的苹果风、以及玻璃态/模糊的装饰性效果。它始终保持在亮色模式下，底色是温暖的灰白色（`#f4f3ec`），上面覆盖点阵网格纹理。

**Key Characteristics:**
- 2px 实心黑边框作为主要的结构语言
- 硬偏移阴影（无模糊）提供触觉式深度反馈
- 三种柔色强调色（薰衣草紫、樱花粉、薄荷青）各司其职
- 单字体体系（Inter），通过粗细对比建立层次
- 点阵网格背景纹理贯穿整个应用
- 亮色模式 only — 暖白基底，墨黑文字

## 2. Colors

调色板建立在暖白基底之上，三种柔和的粉彩色块作为强调，搭配从纯黑到石板灰的中性色阶。

### Primary
- **薰衣草紫** (`#cba0ff`): 主要的交互强调色。用于按钮 accent 变体、激活态标签页背景、chips、进度条填充、range slider 填充。也作为 prompt picker 的选中态和 toggle 开关的开启态。

### Secondary
- **樱花粉** (`#ffaef3`): 辅助强调色。用于次要装饰元素、LOGO 色块之一、进度动画的中间帧。出场频率低于紫色，用于需要视觉区分但不需要紫色权重的场景。

### Tertiary
- **薄荷青** (`#93ecff`): 信息/状态指示色。用于 badge 背景、成功状态 alert、视频素材缩略图占位、LOGO 色块之一。传达「完成/可用/信息」的信号，与紫色的「交互」和粉色的「装饰」形成功能分工。

### Neutral
- **暖白基底** (`#f4f3ec`): 页面背景色。带极微量暖色调的灰白色，覆盖点阵网格纹理后形成类似网格纸的质感。
- **纯白纸面** (`#ffffff`): 卡片、输入框、下拉菜单等 elevated 容器的背景色。在暖白基底上形成清晰的层次分离。
- **墨黑** (`#0a0a0a`): 主文字色、主按钮背景色、边框色、阴影色。不是纯黑（`#000`），有极微量的暖调。
- **石板灰** (`#6b7280`): 辅助文字、提示文字、placeholder、描述性标签。用于不需要墨黑权重的信息层级。
- **深石板灰** (`#334155`): 加强版辅助文字，用于需要比 muted 更强但不到 ink 的场景（如进度标签）。

### Semantic
- **警示红** (`#ff5a5f`): 错误状态、删除操作、危险按钮。高饱和暖红，在柔色系统中足够突出。
- **柔红底** (`#ffe6e7`): 错误 alert 背景、删除按钮 hover 前的底色。
- **柔紫底** (`#ebdbff`): 紫色系的柔和背景变体。用于 tab 激活态背景、hover 态背景。
- **柔粉底** (`#ffdee0`): 粉色系的柔和背景变体（当前使用较少，作为扩展保留）。

### Named Rules

**三色分工规则。** 紫色 = 交互（按钮、选中态、chips），青色 = 状态（badge、成功、信息），粉色 = 装饰（LOGO、动画过渡）。绝不混用：不用青色做主要按钮，不用紫色做成功提示。

**墨黑唯一规则。** 所有边框和主要文字使用同一个 `#0a0a0a`。没有「深灰边框」或「浅黑文字」— 系统的结构语言是二元的（墨黑线条 + 柔色块面），灰度仅用于辅助文字层级。

## 3. Typography

**Font:** Inter（system-ui, Segoe UI, Roboto 作为 fallback）

**Character:** 单一字体通过粗细和大小建立完整的层次体系。Inter 的几何骨架与 2px 粗边框和硬阴影在气质上一致 — 都是干脆、不拖沓的线条。不使用衬线体或等宽体，保持工具的效率和统一感。

### Hierarchy
- **Display** (900, 24px, line-height 1.2): 面板标题、历史列表标题。页面中最高层级的信息标识。
- **Body** (400–600, 15px, line-height 1.6): 正文、表单标签、按钮文字、下拉选项。15px 比常见的 16px 略紧凑，配合粗边框系统不会显得拥挤。
- **Label** (800, 12px, letter-spacing 0.08em, uppercase): 表单字段标签、分类小标题。小型大写风格提供清晰的视觉锚点，扫描时快速定位表单区域。

### Named Rules

**粗细即层次规则。** 不依赖字号缩放来建立层次。Display 和 Body 之间只差 9px，但 900 vs 400 的粗细差距提供了足够的对比。如果需要第三个层次，使用 600–700 的 semibold/bold，而不是引入第三级字号。

**无衬线单轨规则。** 全界面使用 Inter 一个字体家族。不用等宽体展示代码，不用衬线体增加「人文感」。工具型产品的字体一致性本身就是一种清晰的声明。

## 4. Elevation

uhyc 的深度系统是触觉式的：阴影不是模拟环境光（无模糊、无扩散），而是模拟物理偏移 — 像印刷品上的套印错位或活字印刷的压痕。深度只存在于交互状态中；静态元素保持平坦。

**The Tactile Feedback Rule.** 阴影是交互状态的函数，不是静态装饰。默认态元素没有明显阴影（卡片除外，使用硬阴影作为容器边界）；hover 时元素「抬起」（shadow 增大 + translate 偏移）；active 时元素「按下」（shadow 缩小 + translate 反向）。禁用态没有任何阴影变化。

### Shadow Vocabulary
- **印刷偏移-sm** (`box-shadow: 2px 2px 0 #0a0a0a`): 轻度抬起。用于 ghost 按钮默认态、small badge、输入框 focus 态。
- **印刷偏移** (`box-shadow: 4px 4px 0 #0a0a0a`): 标准抬起。用于主按钮默认态、下拉菜单、任务卡片。
- **印刷偏移-lg** (`box-shadow: 6px 6px 0 #0a0a0a`): 深度抬起。用于 hover 态按钮、主卡片。
- **全屏遮罩** (`box-shadow: 0 0 40px rgba(0,0,0,0.5)`): 仅用于图片全屏 overlay 的柔和暗角。这是系统中唯一使用模糊阴影的地方，因为它不再是「触觉深度」，而是「注意力遮罩」。

## 5. Components

### Buttons

按钮是系统中最具触觉表现力的元素。三种变体共享相同的形状语言，通过颜色区分权重。

- **Shape:** 8px 圆角，2px 黑色边框
- **Primary (uhyc-btn):** 墨黑背景 (`#0a0a0a`) + 白字。最高权重操作：提交生成、确认操作。shadow: 4px 4px 0。
- **Accent (uhyc-btn--accent):** 薰衣草紫背景 (`#cba0ff`) + 墨黑文字。次级强调操作。shadow: 4px 4px 0。
- **Ghost (uhyc-btn--ghost):** 白色背景 + 墨黑文字。三级操作：取消、登出、辅助功能。shadow: 2px 2px 0。
- **Hover:** translate(-2px, -2px) + shadow 增大至 6px 6px 0。元素视觉上「浮起」。
- **Active:** translate(1px, 1px) + shadow 缩小至 2px 2px 0。元素「被按下」。
- **Disabled:** opacity 0.6, cursor not-allowed, 无 hover/active 变换。

### Cards / Containers

- **Shape:** 10px 圆角，2px 黑色边框，6px 6px 0 硬阴影
- **Background:** 纯白 (`#ffffff`)
- **Structure:** 三段式 — head（标题区，底部 2px 分隔线）、body（可滚动内容区，28px padding）、foot（操作区，顶部 2px 分隔线）
- **Task Card 变体:** 16px 内边距，更紧凑；包含 head（模型名 + 状态 badge）、preview（媒体内容）、foot（时间戳 + 操作按钮）

### Inputs / Fields

- **Style:** 白色背景，2px 黑色边框，8px 圆角，12px 14px 内边距
- **Font:** 15px Inter
- **Focus:** shadow-sm (2px 2px 0) + translate(-1px, -1px) — 输入框轻微「浮起」表示获得焦点
- **Placeholder:** 当前使用 `#9aa3af`（slate-400），与白色背景的对比度约为 2.8:1，**未达到 WCAG AA 4.5:1 要求**。应调整为 `#6b7280`（slate-500，约 5.2:1）或更深的 `#4b5563`。
- **Textarea:** min-height 200px, resize vertical, 共享 input 的 focus 行为

### Chips

- **Style:** 薰衣草紫背景 (`#cba0ff`)，墨黑文字，2px 黑色边框，6px 圆角
- **内联 Chip:** 在 contentEditable prompt 编辑器中以 inline-flex 嵌入文本流，padding 0 6px，font-size 13px，font-weight 800
- **视频 Chip 变体:** 使用薄荷青背景 (`#93ecff`) 区分视频素材引用

### Tabs / Sub-tabs

- **主 Tab (uhyc-tabs):** 2-column grid，底部 2px 黑色分隔线。激活态：柔紫底 + 底部 3px 墨黑指示条。hover：暖白基底。
- **子类目 Tab (gen-subtab):** 水平滚动 pill 列表。默认：白底黑字 2px 边框。激活：墨黑底白字。hover：柔紫底。font-size 13px，font-weight 700，全圆角 pill。

### Toggle Switch

- **Shape:** 44×24px 全圆角 pill，2px 黑色边框
- **Off:** 白色背景，墨黑圆形 thumb 位于左侧
- **On:** 薰衣草紫背景，thumb translateX(20px) 到右侧
- **Transition:** 0.15s ease，背景色和 thumb 位移同步

### Dropdown

- **Trigger:** 继承 input 样式，带 chevron 图标
- **Menu:** 绝对定位（top: calc(100% + 6px)），白色背景，2px 边框，8px 圆角，4px 4px 0 阴影，max-height 240px 可滚动
- **Option:** 透明背景，hover 柔紫底。激活态：墨黑底白字
- **Z-index:** 20（高于卡片内容，低于 overlay 和 modal）

### Resolution Picker

- **Layout:** 3-column grid，gap 8px
- **Card:** 白色背景，2px 边框，8px 圆角，纵向 flex 布局（矩形预览 + 比例标签 + 像素标签）
- **Active:** 柔紫底 + shadow-sm + translate(-1px, -1px)
- **矩形预览:** 墨黑填充，3px 圆角，尺寸按实际宽高比缩放

### Range Slider

- **Track:** 白色背景，2px 黑色边框，全圆角，8px 高
- **Fill:** 薰衣草紫，绝对定位在 track 内左侧
- **Thumb:** 20×20px 圆形，墨黑填充 + 白色 2px 边框 + 墨黑 2px 外圈（box-shadow 模拟）
- **Label:** 柔紫底，2px 边框，6px 圆角，等宽数字显示

### Prompt Editor

- **Editor:** contentEditable div，共享 input 样式，min-height 200px
- **Placeholder:** 通过 `:empty::before` + `data-placeholder` 属性实现
- **Chips:** 内联 flex 元素，不可编辑（user-select: none），可被删除
- **Picker:** 绝对定位浮层，z-index 30，显示可用素材缩略图列表，键盘导航支持

### Status Badges

- **Shape:** 全圆角 pill，2px 黑色边框，2px 2px 0 阴影
- **成功 (gen-status--ok):** 薄荷青背景，墨黑文字
- **运行中 (gen-status--run):** 薰衣草紫背景，墨黑文字
- **错误 (gen-status--err):** 柔红底，警示红文字
- **默认 Badge (uhyc-badge):** 薄荷青背景，全圆角，2px 2px 0 阴影，12px 800 大写

### Overlay (图片全屏)

- **遮罩:** fixed 全屏，rgba(0,0,0,0.85) 半透明黑，z-index 100
- **图片:** max 90vw × 90vh，8px 圆角，柔光阴影
- **关闭按钮:** 40×40px 圆形，白色背景，2px 边框，右上角定位

## 6. Do's and Don'ts

### Do:
- **Do** 所有边框使用同一个 `#0a0a0a` 和 2px 宽度。这是系统的结构骨架，不要引入不同颜色的边框。
- **Do** 紫色 = 交互、青色 = 状态、粉色 = 装饰。保持三色的功能分工。
- **Do** 在 hover/active 时使用 translate + shadow 变化提供触觉反馈。静态元素不需要阴影。
- **Do** 使用 dot-grid 背景（radial-gradient, 22px 间距）作为默认页面纹理。不要用纯色背景替代。
- **Do** 保持亮色模式。暖白基底 (`#f4f3ec`) 是系统的底色，不要引入暗色模式。
- **Do** 正文文字与背景的对比度 ≥ 4.5:1，大号文字（≥18px 或 bold ≥14px）≥ 3:1。Placeholder 文字同样需要 4.5:1。

### Don't:
- **Don't** 使用暗黑科技/终端风格 — 严禁纯黑背景、霓虹色、等宽字体默认排版、终端绿。这不是一个 hacker 工具。
- **Don't** 使用 SaaS 蓝色调模板 — 禁止蓝色作为主强调色、柔和阴影白卡片堆叠、标准 SaaS 布局套路。
- **Don't** 使用玻璃态/毛玻璃效果做默认装饰。模糊和半透明只在必要时使用（如图片 overlay 遮罩），不作为常规设计语言。
- **Don't** 引入 `border-left` 或 `border-right` 大于 1px 的侧边彩色条纹。系统的边框语言是全边框 2px。
- **Don't** 使用渐变文字（background-clip: text）。强调通过粗细或颜色变化，不通过渐变。
- **Don't** 使用超过 16px 的圆角在卡片或容器上。10–12px 是上限。全圆角 pill 仅用于 badges、tabs、toggles 等小元素。
- **Don't** 在没有交互状态变化时添加阴影。静态 decorative 阴影违背触觉反馈原则。
- **Don't** 在 hover 时同时使用 `border: 1px solid` + `box-shadow` 大 blur（≥16px）。这个系统的阴影是硬偏移，不是柔和投影。
