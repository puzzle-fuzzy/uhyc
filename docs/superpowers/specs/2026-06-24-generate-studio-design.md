# Generate Studio — 设计规格

> 把 `@uhyc/bailian` 的模型定义能力通过后端传递给前端 `apps/generate`，做成一个左（生成器）右（历史记录）两栏的生成工作台。后端代理百炼调用、持久化任务、下载产物到本地磁盘；前端由模型元数据驱动渲染表单，并轮询任务状态。

---

## 1. 架构总览

### 1.1 信任边界与数据流

- **后端代理百炼调用**：前端不持 API Key，所有百炼调用经 Elysia 后端（与现有 auth 架构一致）。后端用 `@uhyc/bailian` 的 `createTask` / `queryTask`。
- **前端轮询后端**：DB 是任务状态的唯一真源。前端周期性 `GET /tasks/:id`，后端转发到百炼并回写状态。
- **产物下载到本地磁盘**：任务成功后，后端把百炼返回的临时 URL 资源下载到 `storage/<task_id>/`，原样保留百炼返回的 hash 文件名，DB 详细记录每个文件。

```
apps/generate (前端)
   │  ① GET  /api/generate/catalog            （拿模型目录驱动表单）
   │  ② POST /api/generate/tasks              （创建任务）
   │  ③ GET  /api/generate/tasks/:id          （轮询，后端同步百炼+下载）
   │  ④ GET  /api/generate/tasks              （历史列表）
   ▼
Elysia 后端 (services/api · modules/generate)
   │  用 @uhyc/bailian 的 createTask / queryTask
   ▼
百炼 API (https://dashscope.aliyuncs.com/api/v1)
```

### 1.2 核心架构优势

`@uhyc/bailian` 的 `ModelDefinition.fields[]` 是**自描述表单 schema**：每个 `FieldMeta` 带 `key/label/type/group/defaultValue/required/options/min-max`。因此前端表单**完全由后端 catalog 返回的元数据驱动渲染**，新增模型零前端改动。

---

## 2. 数据库设计

在 `packages/db/src/schema/index.ts` 新增两张表，与现有 `users` 并列。

### 2.1 表 `generation_tasks`（生成历史记录主表）

每条任务 = 一条历史记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid pk `defaultRandom()` | 内部任务 ID |
| `user_id` | uuid fk→users.id, not null | 归属用户 |
| `bailian_task_id` | varchar(128), nullable | 百炼 task_id（查状态用） |
| `create_request_id` | varchar(128), nullable | **创建任务那次调用**的 request_id（对账/工单） |
| `category` | varchar(20), not null | `image` / `video` / `music` |
| `sub_category` | varchar(40), not null | `text-to-video` 等 |
| `model` | varchar(60), not null | `wan2.7-t2v` 等 |
| `params` | jsonb, not null | 用户参数快照（含默认值合并结果，用于复现） |
| `status` | enum `task_status` | 与 `@uhyc/bailian` 的 `TASK_STATUS` 对齐：PENDING/RUNNING/SUCCEEDED/FAILED/CANCELED/UNKNOWN |
| `error_message` | text, nullable | 失败时的 `code: message` |
| `created_at` | timestamptz default now() not null | |
| `updated_at` | timestamptz default now() not null | 每次回写时更新 |

索引：
- `(user_id, created_at DESC)` — 历史列表，按用户、最新在前
- `bailian_task_id` UNIQUE — 轮询回写按百炼 task_id 定位，防重复

### 2.2 表 `generation_task_files`（文件明细表）

一个任务可产多个文件（主产物 + 字幕 srt/txt/json + ...）。每个文件独立一行。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | uuid pk | |
| `task_id` | uuid fk→generation_tasks.id, not null | 关联任务 |
| `kind` | varchar(30), not null | 文件角色：`primary`（主产物视频/图/音频）/ `subtitle-srt` / `subtitle-txt` / `subtitle-json` / `meta` |
| `source_url` | varchar(1024), nullable | 百炼返回的原始 URL（临时，留档对账用） |
| `storage_path` | varchar(255), not null | 本地磁盘相对路径，如 `storage/<task_id>/abc123.mp4` |
| `mime_type` | varchar(100), nullable | `video/mp4` 等 |
| `size_bytes` | integer, nullable | 文件大小 |
| `original_filename` | varchar(255), nullable | 百炼 URL 末段的原始文件名（如 `abc123.mp4`，原样存） |
| `created_at` | timestamptz default now() | |

索引：`task_id`

### 2.3 存储目录规范

```
storage/
└── <task_id>/                      # 内部任务 uuid
    └── <百炼原始文件名>             # 原样存，如 abc123def.mp4
```

- 不做语义化改名，百炼给什么文件名存什么（hash.后缀）。
- DB 通过 `generation_task_files.storage_path` 精确映射每个文件。
- 前端拿文件 = 读 `generation_task_files` 表 → 取 `storage_path` → 后端 `GET /api/storage/:taskId/:filename` 提供访问。
- 删除任务 = 删目录 + 删 DB 行。

### 2.4 关于 request_id 与 task_id 的区分（重要）

二者语义不同，绝不混用：
- **`task_id`**：百炼任务标识，用于 `queryTask` 查状态/结果。存 `bailian_task_id`。
- **`request_id`**：百炼**每次调用**的追踪号，用于在百炼官方侧排查/对账/工单。创建任务的 `request_id` 存主表 `create_request_id`（最常用，放主表方便取）；查询调用的 request_id **不持久化**（按用户反馈不需要调用日志表，只需生成历史）。

---

## 3. 后端设计（services/api/src/modules/generate）

遵循现有 auth 模块的 MVC 结构：`index.ts`（路由/controller）、`service.ts`（业务逻辑）、`model.ts`（TypeBox DTO），新增 `storage.ts`（下载落盘 + 静态服务）。全部复用现有 `plugins/jwt.ts` 的 `isAuth` 宏守卫。

### 3.1 路由清单（前缀 `/api/generate`，全部需登录）

| 方法 | 路径 | 作用 |
|------|------|------|
| `GET` | `/generate/catalog` | 返回模型目录（三大类 → 子类 → 模型 + fields 元数据），前端用它驱动整个表单 |
| `POST` | `/generate/tasks` | 创建任务：校验参数 → 调百炼 `createTask` → 入库 PENDING → 返回任务 |
| `GET` | `/generate/tasks` | 当前用户历史记录列表（分页，最新在前） |
| `GET` | `/generate/tasks/:id` | 查单个任务：调百炼 `queryTask` → 若成功则下载文件入库 → 回写状态 → 返回 |
| `GET` | `/generate/storage/:taskId/:filename` | 提供本地文件（静态） |

### 3.2 关键流程

**创建任务 `POST /generate/tasks`**

```
body: { category, subCategory, model, params }
  1. isAuth 守卫（已有）
  2. service.create:
     a. 用 @uhyc/bailian 注册表按 (category, subCategory, model) 找到 ModelDefinition
     b. validateParams + sanitizeParams + applyDefaults → 失败返回 422（复用 bailian 校验）
     c. 本地先 INSERT generation_tasks (status=PENDING, bailian_task_id=null) 拿内部 id
     d. createTask(bailianClient, definition, params) → { task_id, request_id }
        ↳ 失败：UPDATE status=FAILED + error_message，仍返回任务（HTTP 200，前端看 status）
     e. UPDATE bailian_task_id, create_request_id
     f. 返回任务行
```

**轮询任务 `GET /generate/tasks/:id`**

```
  1. isAuth 守卫
  2. service.findOne + sync:
     a. 查 DB 任务行（必须是本人，否则 404）
     b. 若 status 已终态(SUCCEEDED/FAILED/CANCELED/UNKNOWN) → 直接返回（不再调百炼，省钱）
     c. 否则 queryTask(bailianClient, bailian_task_id):
        - PENDING/RUNNING → UPDATE status，返回
        - SUCCEEDED → 下载所有产物文件到 storage/<id>/，每个 INSERT generation_task_files，
                      UPDATE status=SUCCEEDED，返回（带 files）
        - FAILED → UPDATE status + error_message，返回
```

**下载逻辑**（成功时）：从百炼响应解析产物 URL。本次实现 **video 领域**：解析 `output.video_url`（单文件，kind=`primary`）。image / music 领域的产物 URL 解析**随模型一起补**（本次范围外，见 §5），届时按实际响应字段（如图片 `output.url` / 音乐 `output.audio_url`）分支。流程统一：`fetch` 下载 → 保留原始文件名（URL 末段）→ 写 `storage/<task_id>/<filename>` → 记录 `generation_task_files`。衍生文件（字幕 srt/txt/json 等）的下载随对应字幕功能实现，届时新增 `kind` 值。

### 3.3 catalog 接口

`GET /generate/catalog` 把 `@uhyc/bailian` 的 `videoModels/imageModels/musicModels` 注册表序列化返回：

```ts
{
  video:   { 'text-to-video': [ModelDefinition,...], 'image-to-video': [], ... },
  image:   { 'text-to-image': [], ... },
  music:   { 'text-to-music': [] }
}
```

前端从后端拿目录（不直接 import bailian 包），后端控制暴露哪些模型。

### 3.4 配置

`services/api/.env` 新增：
- `BAILIAN_API_KEY` — 百炼 API Key（必填，否则 catalog/任务接口报配置错误）
- `BAILIAN_BASE_URL` — 可选，默认 `https://dashscope.aliyuncs.com/api/v1`

### 3.5 新增依赖

`services/api/package.json`：
- `@uhyc/bailian` `workspace:*`（模型定义 + createTask/queryTask）

### 3.6 目录结构

```
services/api/src/
├── modules/
│   ├── auth/          (已有)
│   └── generate/
│       ├── index.ts      # 路由（Elysia controller）
│       ├── service.ts    # 业务逻辑（create/findOne+sync/list/catalog）
│       ├── storage.ts    # 下载 + 文件落盘 + 静态服务
│       └── model.ts      # TypeBox DTO（请求/响应）
└── plugins/jwt.ts        (已有，复用 isAuth)
```

---

## 4. 前端设计（apps/generate）

复用现有 brutalist 设计系统（`@uhyc/shared` 的 `.uhyc-card/.btn/.input/.tabs`），左右两栏布局，左侧生成器、右侧历史记录。

### 4.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  topbar: [logo uhyc·generate]        [avatar][username][登出] │  ← 复用现有
├──────────────────────────┬──────────────────────────────────┤
│  左栏（生成器 max-560 固定）│  右栏（历史记录，虚拟滚动条可滚动）  │
│                          │                                   │
│  ┌────────────────────┐  │  ┌─────────────────────────────┐  │
│  │ [大类下拉]          │  │  │ 任务卡 1 (最新·成功)         │  │
│  │ 视频▾               │  │  │ ● wan2.7 · [视频预览]        │  │
│  │ [小类 tab]          │  │  └─────────────────────────────┘  │
│  │ 文生视频│图生视频…   │  │  ┌─────────────────────────────┐  │
│  │ [模型下拉]          │  │  │ 任务卡 2 (运行中·spinner)    │  │
│  │ HappyHorse▾         │  │  └─────────────────────────────┘  │
│  │ ── 元数据表单 ──     │  │  ┌─────────────────────────────┐  │
│  │ 文本提示词*          │  │  │ 任务卡 3 (失败·错误码)       │  │
│  │ [textarea]          │  │  └─────────────────────────────┘  │
│  │ 分辨率 宽高比 时长   │  │                                   │
│  │ [select][select][range]│ │                                   │
│  │ [   生成   ] (sticky)│  │                                   │
│  └────────────────────┘  │                                   │
└──────────────────────────┴──────────────────────────────────┘
```

### 4.2 左栏组件树（生成器）

```
<GeneratorPanel>
├── <CategorySelect>              # 大类下拉: 图片/视频/音乐
├── <SubCategoryTabs>             # 小类 tab（按当前大类从 catalog 取 keys）
├── <ModelSelect>                 # ★模型下拉（当前小类下的模型，非单选列表）
├── <DynamicForm>                 # ★核心：按选中模型的 fields[] 渲染
│   ├── 按 group 分两组：input 组(提示词等)在上，parameters 组(参数)在下
│   └── <FieldRenderer> 遍历 fields，按 type 渲染:
│       ├── text    → textarea/input
│       ├── number  → number input
│       ├── boolean → 切换开关
│       ├── select  → <select>
│       └── range   → 滑块 + 数值显示
└── <GenerateButton>              # 提交，提交中显示 spinner，sticky 在底部
```

**空态**：当某小类无模型（如现在的图片/音乐），ModelSelect 显示"该类别暂无可用模型"，DynamicForm/GenerateButton 隐藏。

**状态管理**（单 `params` 字典）：
- `selected: { category, subCategory, model }` + `params: Record<string,unknown>`
- 切换模型 → 用新 `fields` 的 `defaultValue` 重置 `params`
- 提交前由后端校验（422 返回 errors 渲染到对应 field 下）

### 4.3 右栏组件树（历史记录）

```
<TaskHistory>                    # ScrollArea 包裹的列表容器
└── <TaskCard>*                  # 每条记录
    ├── 头部: category 图标 + model + 状态徽章(颜色区分)
    ├── 预览:
    │   - SUCCEEDED → video/image/audio 预览（读 storage URL）
    │   - RUNNING/PENDING → spinner + "生成中…"
    │   - FAILED → 错误信息
    ├── 底部: subCategory · 相对时间 · [重跑](同参数回到左栏)
    └── 展开: 完整 params（折叠，点开看详情/复现）
```

记录**按 `created_at` 倒序**。

### 4.4 轮询逻辑（前端）

- 创建任务后，新任务**插到列表顶部**（乐观更新），状态 PENDING。
- 对所有**非终态**任务启动轮询：每 **8s** `GET /tasks/:id`，状态变化则更新卡片。
- 终态(SUCCEEDED/FAILED/CANCELED/UNKNOWN)停止轮询，SUCCEEDED 卡片加载本地文件预览。
- 用 `setInterval` + "活跃任务 id 集合"，组件卸载清理。

### 4.5 虚拟滚动条

- 选用 **`@radix-ui/react-scroll-area`**（已验证 `1.2.12` 支持 `react:^19.0`）。它是 headless 组件，用现有 brutalist CSS token 自定义滚动条样式（与整体风格一致），不做虚拟列表（记录量现阶段不大）。
- 包裹 `<TaskHistory>` 列表区域，替代原生滚动条。

### 4.6 新增文件（apps/generate/src）

```
src/
├── App.tsx                      # 布局：topbar + 左右两栏
├── components/
│   ├── GeneratorPanel.tsx       # 左栏整体
│   ├── CategorySelect.tsx       # 大类下拉
│   ├── SubCategoryTabs.tsx      # 小类 tab
│   ├── ModelSelect.tsx          # 模型下拉
│   ├── DynamicForm.tsx          # 元数据驱动表单
│   ├── FieldRenderer.tsx        # 单字段渲染（按 type 分支）
│   └── TaskHistory.tsx          # 右栏记录列表（ScrollArea 包裹）
│       └── TaskCard.tsx         # 单条记录
├── hooks/
│   ├── useCatalog.ts            # 拉 GET /catalog
│   ├── useGenerate.ts           # POST /tasks + 轮询管理
│   └── useTaskHistory.ts        # GET /tasks 列表
└── api.ts                       # fetch 封装（catalog/tasks）
```

### 4.7 新增依赖

`apps/generate/package.json`：
- `@radix-ui/react-scroll-area` `^1.2.12`（虚拟滚动条）

### 4.8 样式

复用 `.uhyc-card/.uhyc-btn/.uhyc-input/.uhyc-tabs`，新加少量局部样式放 `App.css`：
- 左右栏 grid 布局
- 状态徽章配色（成功=青 `--cyan`、运行=紫 `--purple`、失败=红 `--red-soft`/`--danger`）
- 视频预览框
- ScrollArea 滚动条样式（用 `--ink` 边框 + `--muted` 滑块）
- 左栏"生成"按钮 sticky 底部

---

## 5. 范围边界（本次不做）

- 不做实际"图片/音乐"模型填充（bailian 包的 image/music 仍为空，UI 空态处理）。后续单独补模型。
- 不做 OSS 迁移（本地磁盘先跑）。
- 不做调用日志表（按反馈只需生成历史，即 `generation_tasks` 本身）。
- 不做 RBAC/配额/计费。
- 不做百炼 `task_id` 查询 24h 过期的兜底（按需后续加）。

---

## 6. 验证计划

1. DB：`bun run --filter '@uhyc/db' generate && migrate`，确认两表 + 索引创建正确。
2. 后端：`bun run --filter '@uhyc/backend' test`，新增 generate 模块测试，**现有 23 个 auth 测试保持绿**。
3. catalog：`curl GET /api/generate/catalog` 返回含 video text-to-video 的两个模型 + fields。
4. 创建任务：用 HappyHorse 文生视频真实提交（需 `BAILIAN_API_KEY`），返回 PENDING + bailian_task_id + create_request_id。
5. 轮询：多次 `GET /tasks/:id` 直到 SUCCEEDED，确认文件下载到 `storage/<id>/`，`generation_task_files` 有记录，返回带 `video_url` 本地路径。
6. 前端：左栏选 视频→文生视频→模型下拉→填表→生成，右栏出现新卡片轮询变成功可预览；切换图片/音乐显示空态；登出跳 auth。
