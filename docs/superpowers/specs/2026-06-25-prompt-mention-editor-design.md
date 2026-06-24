# Prompt @ 引用编辑器 — 设计规格

> 为 `apps/generate` 的提示词输入区增加 `@` 提及参考素材的能力。用户在 prompt 里打 `@` 弹出已上传的参考图/视频缩略图，选中后插入可视化 chip；提交时 chip 按模型家族的引用语法（`图1`/`[Image 1]`）序列化进 prompt 字符串，对应素材组成 `media[]` 传给后端。自制实现，零新依赖。

---

## 1. 背景与目标

### 1.1 百炼的引用语法（核心约束）

百炼不同模型家族在 prompt 中指代参考素材的语法**不同**，必须按模型适配：

| 模型家族 | 引用语法 | 图/视频计数 | 出处 |
|----------|----------|-------------|------|
| **万相 wan2.7**（r2v/video-edit） | `图1`/`图2`（中文）或 `Image 1`/`Image 2`（英文）；视频 `视频1`/`视频2` | 图与视频**分别计数** | `docs/bailian/万相2.7-参考生视频.md` |
| **欢乐马 HappyHorse**（r2v/video-edit） | `[Image 1]`、`[Image 2]`（带方括号） | 仅图片，**不支持视频引用** | `packages/bailian/.../happyhorse-r2v.ts` |

编号顺序与 `media[]` 数组顺序一致；图与视频分别计数（可同时存在 `图1` + `视频1`）。

### 1.2 目标

- prompt 输入区支持 `@` 提及参考素材，插入可视化 chip（非纯文本）。
- chip 按模型 `refSyntax` 序列化为正确格式。
- 图+视频都支持引用（万相），欢乐马仅图。
- 零新 npm 依赖（不用 platejs/tiptap）。

---

## 2. 数据模型

### 2.1 新增 schema 字段：`refSyntax`

`@uhyc/bailian` 的 `ModelDefinition`（`packages/bailian/src/video/types.ts`）加可选字段：

```ts
/** prompt 中参考素材的引用语法风格，决定 chip 序列化格式 */
refSyntax?: 'bracket-en' | 'cn-prefixed'
```

- `'bracket-en'`（欢乐马）：chip → `[Image 1]`（仅图片）
- `'cn-prefixed'`（万相）：chip → `图1`、`视频1`（图/视频分别计数）
- 缺省（t2v/t2i 等无 media 模型）：不适用

现有模型补值：
- `happyhorse-r2v` / `happyhorse-video-edit` = `'bracket-en'`
- `wan2.7-r2v` / `wan2.7-video-edit` = `'cn-prefixed'`

### 2.2 前端类型（`apps/generate/src/types.ts`）

```ts
export type RefSyntax = 'bracket-en' | 'cn-prefixed'

/** 一个参考素材（参考素材区的产物，也是 media[] 的元素） */
export interface MediaItem {
  /** 前端临时 id */
  id: string
  /** bailian 类型 */
  type: 'reference_image' | 'reference_video' | 'first_frame'
  /** 上传后的 URL（现阶段本地 blob，OSS 后接） */
  url: string
  /** 显示编号，如 "图1" / "视频1" / "[Image 1]"（按 refSyntax 生成） */
  label: string
  /** 本地预览缩略图 URL（视频取首帧/占位） */
  thumbnail?: string
}
```

`ModelDefinition` 前端镜像加 `refSyntax?: RefSyntax`。

### 2.3 media 字段值的两种形态

- **单图模型**（i2v/first_frame，无 refSyntax）：`media` 值 = 单个 URL 字符串（保留现有 `MediaUpload`）。
- **多素材模型**（r2v/video-edit，有 refSyntax）：`media` 值 = `MediaItem[]` 数组（新 `ReferenceAssets` + `PromptEditor`）。

---

## 3. 组件设计

### 3.1 文件结构（apps/generate）

```
src/
├── types.ts                       # 加 MediaItem / RefSyntax
├── lib/
│   └── promptSerializer.ts        # 【新】纯函数：chip 序列化 + 编号计算（可单测）
├── components/
│   ├── ReferenceAssets.tsx        # 【新】参考素材区（多图/视频上传+编号网格）
│   ├── PromptEditor.tsx           # 【新】contentEditable @ 编辑器 + chip
│   └── FieldRenderer.tsx          # 改：media 字段按 refSyntax 分流
└── App.css                        # 加：chip/素材网格/@浮层样式
```

### 3.2 组件职责

| 组件 | 职责 | 受控状态 |
|------|------|----------|
| `ReferenceAssets` | 多素材管理：上传（图/视频）、缩略图网格、自动编号、删除。bracket-en 隐藏视频按钮 | `params.media` (`MediaItem[]`) |
| `PromptEditor` | contentEditable 输入 + @ 触发 + chip 插入/删除 + 序列化 | `params.prompt`（候选素材来自 `params.media`） |
| `FieldRenderer` | media 分支升级：检测模型 `refSyntax`——有则渲染 ReferenceAssets + PromptEditor（接管 prompt 字段），无则保留单图 MediaUpload | — |

### 3.3 状态归属

全部状态由 `GeneratorPanel` 的 `params` 字典持有（沿用现有架构），组件为受控组件：
- `ReferenceAssets` 读写 `params.media`。
- `PromptEditor` 读写 `params.prompt`，引用候选来自 `params.media`。
- 删素材：`ReferenceAssets` 从 `params.media` 移除 → `PromptEditor` 检测引用列表变化，自动移除失效 chip + 重编号。

### 3.4 PromptEditor 的 @ 触发逻辑（自制，零依赖）

1. 监听 contentEditable 的 `input`/`keyup`，取光标前一个字符。
2. 若是 `@`：在光标下方弹出**素材选择浮层**，列出 `params.media` 的缩略图（带编号徽章）。
3. 键盘 ↑↓ + Enter 或鼠标选中一项：
   - 删除光标处的 `@`。
   - 在光标处插入不可编辑的 `<PromptChip>`（brutalist 色块、Backspace 可删、`contentEditable=false`）。
4. `Escape` 关闭浮层；再次 `@` 重新触发。
5. 已引用素材仍可重复选（bailian 允许同一素材多次提及）。

### 3.5 chip 样式（brutalist）

- 图片 chip：紫色底 `图1` / `[Image 1]`。
- 视频 chip：青色底 `视频1`（仅 cn-prefixed）。
- 2px 黑边 + 小硬阴影，内联文字流，`user-select:none`。

### 3.6 序列化（提交时）

遍历 contentEditable 子节点：
- 文本节点 → 原样拼入 prompt 字符串。
- chip 节点 → 按 `refSyntax` 转换：
  - `bracket-en`：图素材 → `[Image N]`（N = 该图在**所有 reference_image 中的序号**，从 1 起；不支持视频）
  - `cn-prefixed`：图素材 → `图N`（N = reference_image 序号），视频素材 → `视频N`（N = reference_video 序号，与图独立计数）
- 收集被引用的 chip 素材 → `media[]`（按 prompt 中**首次出现顺序**排，与 bailian 数组顺序一致）。

纯函数 `serializePrompt(root: HTMLElement, refSyntax, items)` 抽到 `lib/promptSerializer.ts`，可单元测试。

---

## 4. 数据流

### 4.1 前端 → 后端

```
PromptEditor 序列化 → { prompt: string, media: MediaItem[] }
   │ params.prompt = prompt 字符串
   │ params.media  = media[] (替换原单个 media 字段值)
   ▼
POST /api/generate/tasks { ..., params: { prompt, media } }
   │ 后端 createTask → buildRequestBody(definition, params)
   │   prompt → input.prompt
   │   media  → input.media (已是 bailian 期望的 [{type,url}] 数组)
   ▼
百炼 API
```

### 4.2 后端零改动

`media[]` 本就是 bailian 期望的结构；`buildRequestBody`（`packages/bailian/src/shared/client.ts`）已把 `input` group 字段原样塞入。前端只需把 `media` 字段值组装成 `[{type,url}]`。

### 4.3 编号规则示例

- **万相 r2v**：prompt `图1在视频1里玩耍` + media `[{图,图1},{视频,视频1}]`
- **欢乐马 r2v**：prompt `[Image 1]在[Image 2]里玩耍` + media `[{图,1},{图,2}]`

---

## 5. ReferenceAssets 组件细节

- 顶部「+ 添加图片」按钮；`cn-prefixed` 时额外有「+ 添加视频」按钮（bracket-en 隐藏视频）。
- 上传后：缩略图网格，每项带**自动编号徽章**（图按上传顺序 `图1/图2`，视频 `视频1/视频2`，bracket-en 用 `[Image N]`）。每项可删。
- 现阶段上传用本地 `URL.createObjectURL` 预览（OSS 后接）；编号逻辑立即生效。

---

## 6. 边界与校验

- 欢乐马（bracket-en）不支持视频引用 → 「+ 添加视频」按钮在该 refSyntax 下隐藏。
- 未上传任何素材时打 `@` → 浮层提示「请先上传参考素材」。
- 提交校验：r2v 的 media required → 至少 1 个素材且 prompt 至少引用 1 个（前端预校验提示，后端 422 兜底）。
- 删素材时对应 chip 自动移除 + 剩余素材重编号。

---

## 7. 测试

- **后端**：现有 29 测试保持绿（schema 加可选字段不破坏）。新增 1 个 catalog 测试断言 `refSyntax` 透传。
- **前端**：typecheck + vite 编译。`promptSerializer.ts` 抽为纯函数，用 bun test 单测两种 refSyntax 的序列化（chip → 字符串 + media[] 顺序）。

---

## 8. 范围边界（本次不做）

- 不接 OSS 真实上传（本地 blob 预览，OSS 后续单独做）。
- 不做视频素材的首帧缩略图提取（用占位图标）。
- 不动后端 service/routes/DTO（零逻辑改动）。
- 不动数据库。
- 单图模型（i2v）保留现有 MediaUpload，不引入新组件。
