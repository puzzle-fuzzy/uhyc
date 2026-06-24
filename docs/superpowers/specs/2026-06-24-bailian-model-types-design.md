# 百炼模型参数类型系统设计

> **日期**: 2026-06-24  
> **范围**: `packages/bailian` — 阿里云百炼 API 的模型参数类型定义与运行时元数据  

## 1. 目标

构建一个**运行时元数据驱动**的类型系统，供前端根据所选模型动态渲染参数表单，同时为后端 API 调用提供类型安全的参数校验。

核心原则：
- 每个模型独立定义其参数，互不耦合
- 参数定义包含运行时元数据（label、options、defaults、范围），前端可直接消费
- 三级分类体系支撑 UI 导航：大类 → 小类 → 模型
- 新增模型仅需新增一份定义文件并注册，无需改动任何逻辑代码

---

## 2. 分类体系

```
image（图片生成）
  ├── text-to-image       文生图
  ├── image-to-image      图生图
  └── reference-to-image  参考生图

video（视频生成）
  ├── text-to-video       文生视频
  ├── image-to-video      图生视频
  ├── reference-to-video  参考生视频
  └── video-editing       视频编辑

music（音乐生成）
  └── text-to-music       文生音乐（待后续扩展）
```

---

## 3. 目录结构

```
packages/bailian/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts                          # 顶层导出：所有领域注册表
    ├── shared/
    │   └── types.ts                      # 通用类型：TaskStatus、异步任务请求/响应
    ├── image/
    │   ├── index.ts                      # 图片生成领域注册表（待后续扩展）
    │   └── models/                       # 图片模型定义
    ├── video/
    │   ├── index.ts                      # 视频生成领域注册表
    │   ├── types.ts                      # 视频生成共享类型 + FieldMeta + ModelDefinition
    │   └── models/
    │       ├── happyhorse-t2v.ts         # HappyHorse 文生视频
    │       └── wan2.7-t2v.ts             # 万相 2.7 文生视频
    └── music/
        ├── index.ts                      # 音乐生成领域注册表（待后续扩展）
        └── models/
```

---

## 4. 核心类型

### 4.1 参数元数据 `FieldMeta`

每个字段包含完整的前端渲染信息：

```ts
type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'range'

interface FieldMeta {
  /** API 参数名，如 "resolution"、"ratio" */
  key: string

  /** 前端表单 label */
  label: string

  /** 补充说明，以 tooltip 形式展示 */
  description?: string

  /** 控件类型，前端据此渲染组件 */
  type: FieldType

  /** 默认值 */
  defaultValue: unknown

  /** 是否必填，默认 false */
  required?: boolean

  // --- select / radio 专有 ---
  /** 可选项列表 */
  options?: { label: string; value: unknown }[]

  // --- number / range 专有 ---
  min?: number
  max?: number

  // --- text 专有 ---
  maxLength?: number

  /** 条件可见：传入已填写的参数，返回该字段是否显示 */
  visible?: (params: Record<string, unknown>) => boolean
}
```

### 4.2 模型定义 `ModelDefinition`

```ts
interface ModelDefinition {
  /** API 调用时的模型标识，如 "wan2.7-t2v" */
  model: string

  /** 该模型标志符支持的所有版本，如 ["happyhorse-1.1-t2v", "happyhorse-1.0-t2v"] */
  supportedModels: string[]

  /** 前端展示名称 */
  displayName: string

  /** 大类 */
  category: 'image' | 'video' | 'music'

  /** 小类 */
  subCategory: string

  /** 有序参数列表，前端按数组顺序渲染 */
  fields: FieldMeta[]
}
```

### 4.3 领域注册表

```ts
/** 每个领域的注册表：小类 → 模型列表 */
type ModelRegistry = Record<string, ModelDefinition[]>
```

示例（视频领域）：

```ts
export const videoModels: ModelRegistry = {
  'text-to-video':      [happyhorseT2v, wan27T2v],
  'image-to-video':     [],
  'reference-to-video': [],
  'video-editing':      [],
}
```

---

## 5. 共享类型 `shared/types.ts`

所有异步任务 API 共用的请求/响应结构：

```ts
type TaskStatus =
  | 'PENDING'    // 排队中
  | 'RUNNING'    // 处理中
  | 'SUCCEEDED'  // 执行成功
  | 'FAILED'     // 执行失败
  | 'CANCELED'   // 已取消
  | 'UNKNOWN'    // 不存在或状态未知

/** 步骤1 - 创建任务的响应 */
interface CreateTaskResponse {
  output: { task_id: string; task_status: TaskStatus }
  request_id: string
}

/** 步骤2 - 任务失败时的响应 */
interface TaskErrorOutput {
  task_id: string
  task_status: 'FAILED'
  code: string
  message: string
}

/** API 错误响应 */
interface ApiErrorResponse {
  code: string
  message: string
  request_id: string
}

/** 任务查询响应（泛型） */
interface QueryTaskResponse<TOutput> {
  output: TOutput
  request_id: string
}
```

---

## 6. 模型定义示例

### HappyHorse 文生视频

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| prompt | text | `""` | 必填，≤5000 字符 |
| resolution | select | `"1080P"` | 720P / 1080P |
| ratio | select | `"16:9"` | 9 种宽高比 |
| duration | range | `5` | [3, 15] 秒 |
| watermark | boolean | `true` | "Happy Horse" 水印 |
| seed | number | — | [0, 2147483647] |

### 万相 2.7 文生视频

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| prompt | text | `""` | 必填，≤5000 字符 |
| negative_prompt | text | — | ≤500 字符 |
| resolution | select | `"1080P"` | 720P / 1080P |
| ratio | select | `"16:9"` | 5 种宽高比 |
| duration | range | `5` | [2, 15] 秒 |
| prompt_extend | boolean | `true` | Prompt 智能改写 |
| audio_url | text | — | mp3/wav，2-30s |
| watermark | boolean | `false` | "AI生成" 水印 |
| seed | number | — | [0, 2147483647] |

---

## 7. 前端消费模式

```
选大类 Tab (图片 / 视频 / 音乐)
  → 选小类 Tab (文生视频 / 图生视频 / ...)
    → 选模型 (下拉列表，来自 ModelRegistry[subCategory])
      → 遍历 ModelDefinition.fields 渲染表单
      → 用户填写，收集 Record<string, unknown>
      → 提交 API 调用
```

渲染规则：
- `text` → `<Input>` 或 `<Textarea>`
- `number` → `<InputNumber>`，有 min/max 时显示范围提示
- `boolean` → `<Switch>` 或 `<Checkbox>`
- `select` → `<Select>`，选项来自 `options`
- `range` → `<Slider>`，范围来自 `min/max`
- 有 `visible` 回调的字段：监听其他参数变化，条件渲染

---

## 8. 扩展指南

新增模型只需两步：

1. **新建** `src/<category>/models/<model-slug>.ts`，导出一个 `ModelDefinition`
2. **注册** 在 `src/<category>/index.ts` 的 `ModelRegistry` 对应小类 key 中追加该定义

新增领域（如图像生成）：
1. 新建 `src/image/` 目录，结构同 `video/`
2. 在 `src/index.ts` 添加导出

---

## 9. 校验策略

**双重校验**：前后端各做一次校验。

- **前端**：基于 `FieldMeta` 的 `required`、`min`、`max`、`maxLength` 做格式校验，即时反馈给用户，拦截明显不合法的输入。
- **后端**：调用百炼 API 前，基于同样的 `FieldMeta` 定义再做一次完整校验，确保参数合法，避免无效调用浪费配额。
- 校验逻辑直接读取 `ModelDefinition.fields`，不需要额外维护校验规则。

---

## 10. API 客户端封装

`packages/bailian` 同时封装百炼 API 的 `fetch` 调用逻辑：

- `src/shared/client.ts` — 通用异步任务客户端：`createTask()`、`pollTask()`、`waitForCompletion()`
- 客户端接收 `ModelDefinition` + 用户参数 → 构建请求体 → 调用百炼 API → 返回类型安全的响应
- 支持环境变量 `DASHSCOPE_API_KEY` 和 `DASHSCOPE_BASE_URL`

---

## 11. 包配置

- `package.json`: `"name": "@uhyc/bailian"`, `"type": "module"`
- `tsconfig.json`: 继承 `tsconfig.base.json`，无需额外设置
- 零运行时依赖：纯类型 + 常量对象 + 原生 `fetch`
