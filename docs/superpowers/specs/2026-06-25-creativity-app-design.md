# Creativity App Design

## Context

创建一个新的 creativity 应用，用于处理视频理解、语音识别和脚本合并等任务，区别于现有的图片/视频生成。用户上传一个视频后，通过三步流水线自动处理：

1. **语音识别生成字幕（ASR）** — 使用百炼 Paraformer-v2 模型提取视频中的语音并生成带时间戳的转录文本
2. **视频识别生成完整剧本** — 使用百炼 Qwen-VL-Plus 多模态模型分析视频内容、场景、人物、动作，生成完整剧本
3. **合并字幕和剧本生成专业脚本** — 使用百炼 Qwen-Plus 文本模型将步骤 1 和 2 的结果合并为格式化的专业脚本

## Architecture

```
[用户上传视频] → POST /api/upload → OSS URL
       ↓ (点击"开始处理")
[后端 CreativityService] → 三步流水线自动推进
       ↓
步骤1: ASR (paraformer-v2, 异步) → 轮询 → 转录 JSON → SRT
       ↓ (自动触发)
步骤2: 视频理解 (qwen-vl-plus, 同步) → 剧本
       ↓ (自动触发)
步骤3: 合并 (qwen-plus, 同步) → 专业脚本
       ↓
[前端实时展示每一步结果 + 文件下载]
```

## Backend

### DB Schema

复用现有 `generation_tasks` 表模式，新增 `creativity_tasks` 表：

```sql
CREATE TABLE creativity_tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_url   text NOT NULL,
  status      task_status NOT NULL DEFAULT 'PENDING',
  step        integer NOT NULL DEFAULT 0,  -- 0=ASR, 1=视频理解, 2=合并, 3=完成
  asr_result  jsonb,            -- { text, srt, sentences: [{ begin_time, end_time, text }] }
  script_result text,           -- 视频识别生成的剧本
  merged_result text,           -- 最终合并的专业脚本
  error_message text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

### API Routes

所有路由挂载在 `/creativity` 前缀下，需认证。

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/creativity/tasks` | 创建处理任务。Body: `{ videoUrl: string }`。后端自动从 step=0 开始流水线。 |
| `GET` | `/creativity/tasks` | 历史记录列表 |
| `GET` | `/creativity/tasks/:id` | 查询单个任务状态 + 当前步骤结果 |
| `DELETE` | `/creativity/tasks/:id` | 删除任务（仅 FAILED） |

### Service Logic (`CreativityService`)

```
create(userId, videoUrl)
  → INSERT creativity_tasks (PENDING, step=0)
  → 异步调用 step1_asr()

step1_asr(taskId, videoUrl)
  → UPDATE status=RUNNING
  → POST paraformer-v2 (async)
  → 轮询 queryTask()
  → 获取 transcription_url → 下载 JSON
  → 解析 transcripts[].sentences[] → 生成 SRT + 完整文本
  → UPDATE asr_result, step=1
  → 触发 step2_video_understand()

step2_video_understand(taskId, videoUrl)
  → POST qwen-vl-plus (sync, multimodal-generation)
     prompt: "请详细描述这个视频的内容，包括场景变化、人物动作、对话内容等，生成完整的剧本格式"
  → 提取响应内容 → UPDATE script_result, step=2
  → 触发 step3_merge()

step3_merge(taskId)
  → POST qwen-plus (sync, text-generation)
     prompt: "你有一个视频的语音识别文本和场景剧本，请将它们合并为一个专业的视频脚本..."
  → 提取响应内容 → UPDATE merged_result, step=3, status=SUCCEEDED
```

### ASR Result Format

Paraformer 返回的转录 JSON 结构：

```typescript
interface AsrResult {
  text: string                          // 完整转录文本
  srt: string                           // 生成的 SRT 格式字幕
  sentences: Array<{
    begin_time: number                  // 毫秒
    end_time: number                    // 毫秒
    text: string
    sentence_id: number
  }>
  duration_ms: number
}
```

SRT 生成逻辑：将 `sentences[]` 中的 `begin_time`/`end_time` 转换为 SRT 时间格式 `HH:MM:SS,mmm`。

### Error Handling

- 任一步骤失败 → status=FAILED, errorMessage 记录失败原因
- 支持重试（重新提交会创建新任务）
- 为避免重复扣费，步骤 2/3 仅在步骤 1 成功后才执行

## Frontend

### App Setup

与 generate 一致的 Vite + React 配置：
- 端口 5175
- vite.config.ts 代理 `/api` → `http://localhost:3000`
- 导入 `@uhyc/shared` 的 tokens.css / ui.css
- 复用 auth 流程（`useAuth`、`buildLoginUrl`）

### Component Tree

```
App
├── topbar (logo + user info)
├── gen-layout (two columns)
│   ├── LEFT (sticky)
│   │   ├── VideoUpload
│   │   │   └── 点击/拖拽上传 → OSS → 显示预览
│   │   └── PipelineStatus
│   │       └── 三步状态指示器（待处理/进行中/已完成/失败）
│   └── RIGHT (scrollable)
│       ├── ResultPanel
│       │   ├── ResultCard (ASR)
│       │   │   ├── 完整转录文本预览
│       │   │   └── [下载 SRT] [下载 TXT]
│       │   ├── ResultCard (视频理解)
│       │   │   ├── 剧本内容预览
│       │   │   └── [下载 TXT]
│       │   └── ResultCard (合并脚本)
│       │       ├── 专业脚本预览
│       │       └── [下载 TXT]
│       └── 空状态（无任务时显示）
```

### UI States

| Component | States |
|-----------|--------|
| VideoUpload | empty / uploading / preview + ready |
| PipelineStatus | idle / step1-running / step2-running / step3-running / all-done / error |
| ResultCard | hidden / loading / content / download-ready |
| Button | disabled (no video) / "开始处理" / "处理中..." |

### Result Download

每个结果卡片提供「下载」按钮，前端即时生成文件（不依赖后端存储）：
- SRT 字幕 → 浏览器内拼接 SRT 格式文本 → Blob → download
- TXT 剧本/脚本 → 直接下载为 `.txt` 文件

## Files to Create

### Frontend (8 files)

| File | Description |
|------|-------------|
| `apps/creativity/src/types.ts` | 类型定义（CreativityTask, AsrResult 等） |
| `apps/creativity/src/api.ts` | API 客户端（createTask, listTasks, getTask, deleteTask） |
| `apps/creativity/src/hooks/useCreativity.ts` | 提交 + 轮询 hook |
| `apps/creativity/src/App.tsx` | 主布局 |
| `apps/creativity/src/App.css` | 应用样式 |
| `apps/creativity/src/components/VideoUpload.tsx` | 视频上传组件 |
| `apps/creativity/src/components/PipelineStatus.tsx` | Pipeline 状态指示器 |
| `apps/creativity/src/components/ResultPanel.tsx` | 结果面板 |

### Backend (5 files)

| File | Description |
|------|-------------|
| `services/api/src/modules/creativity/index.ts` | 路由定义 |
| `services/api/src/modules/creativity/service.ts` | 三步流水线逻辑 |
| `services/api/src/modules/creativity/model.ts` | 请求/响应类型 |
| `packages/db/drizzle/<timestamp>_creativity.sql` | DB migration |
| `packages/db/src/schema/creativity.ts` | Drizzle schema |

### Modified Files

| File | Change |
|------|--------|
| `services/api/src/index.ts` | 注册 `creativityModule` |
| `apps/creativity/package.json` | 添加 `@uhyc/shared` 依赖 |
| `apps/creativity/vite.config.ts` | 添加 `/api` 代理 + `--host` |
| `packages/db/src/index.ts` | 导出 creativity 表和类型 |

## UI Design

### Visual Style

完全复用 generate 的 neo-brutalist 设计系统：
- 颜色、边框、阴影、字体来自 `tokens.css`
- 按钮、输入框、卡片来自 `ui.css`
- 布局结构和 generate 保持一致

### Key Design Decisions

1. **左栏 sticky + 右栏滚动** — 跟 generate 一致的上传区+状态区在左，结果在右
2. **Pipeline 状态可视化** — 三步流水线用圆点+标签展示，每步有独立状态（待处理/进行中/已完成/失败）
3. **结果随步骤追加** — 步骤每完成一步，右侧追加对应的 ResultCard，而不是一次性全部展示
4. **即时文件生成** — SRT/TXT 在前端拼接，不依赖后端额外存储
