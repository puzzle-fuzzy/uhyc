# WebSocket Task Status Push — Design Spec

## Overview

Replace the current HTTP-based task polling (`setTimeout` every 5-8s per task) with server-driven WebSocket push. When a task is created, the backend polls Bailian on its own schedule and pushes status changes to the frontend via the existing `/ws/presence` WebSocket connection. When the task reaches a terminal state, polling stops.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| WS endpoint | Extend existing `/ws/presence` | One connection, multiplex presence + task messages |
| Driver | Backend server-side polling | Frontend has zero polling burden. Single source of truth |
| Push scope | Task owner only (per-user routing) | Privacy. Uses `task:<userId>` topic for targeted delivery |
| Fallback | HTTP polling as degraded mode | WS disconnect → revert to existing HTTP polling behavior |

## Architecture

```
┌── Frontend ─────────────────────┐    ┌── Backend ──────────────────────────┐
│                                  │    │                                      │
│  useGenerate                    │    │  POST /generate/tasks               │
│    submit() ──HTTP POST─────────>│───>│    createTask() → Bailian           │
│                                  │    │    taskPoller.register(taskId,uid)  │
│                                  │    │                                      │
│  usePresence (same WS)          │    │  TaskPoller                          │
│    ws.onmessage ◀──WS────────────│────│    pollBailian(taskId)              │
│    case 'task_updated':         │    │    status changed? → push to owner   │
│      updateTaskInState(task)    │    │    terminal? → unregister            │
│                                  │    │                                      │
│  useCreativity                   │    │  CreativityService                  │
│    ws.onmessage ◀──WS────────────│────│    runPipeline() updates DB         │
│    case 'task_updated':         │    │    → push to owner via WS            │
│      updateTask(task)           │    │                                      │
└──────────────────────────────────┘    └──────────────────────────────────────┘
```

## WebSocket Protocol (extended)

### New Message Types

```ts
// Added to the existing message protocol alongside presence messages

type TaskMessage =
  | { type: 'task_updated'; task: TaskResponse }
```

Where `TaskResponse` is the same shape returned by `GET /generate/tasks/:id`:
```ts
interface TaskResponse {
  id: string
  userId: string
  bailianTaskId: string | null
  createRequestId: string | null
  category: string
  subCategory: string
  model: string
  params: Record<string, unknown>
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'UNKNOWN'
  errorMessage: string | null
  files: Array<{ id: string; kind: string; storagePath: string; sourceUrl: string | null; mimeType: string | null; sizeBytes: number | null; originalFilename: string | null }>
  createdAt: string
  updatedAt: string
}
```

### Per-User Topic Routing

On WebSocket `open`, the user subscribes to two topics:
- `presence` — existing, for online user broadcast
- `task:<userId>` — new, for private task updates

```ts
// In WS open handler:
ws.subscribe('presence')
ws.subscribe(`task:${userId}`)

// When pushing a task update:
ws.publish(`task:${userId}`, { type: 'task_updated', task })
```

## Backend: TaskPoller

### New File: `services/api/src/modules/presence/task-poller.ts`

```ts
class TaskPoller {
  private tasks = new Map<string, {
    userId: string
    timer: ReturnType<typeof setTimeout> | null
    lastStatus: string
  }>()

  register(taskId: string, userId: string): void
  unregister(taskId: string): void
  private poll(taskId: string): Promise<void>
}
```

### Polling Logic

1. `register(taskId, userId)`: add to map, schedule first poll at 5s
2. `poll(taskId)`: 
   - Call `GenerateService.findOneAndSync(userId, taskId)` (reuse existing logic)
   - If status changed from `lastStatus` → push `task_updated` to `task:<userId>` topic
   - If terminal → `unregister(taskId)`
   - If non-terminal → schedule next poll with backoff:
     - 5s → 8s → 15s → 30s (cap at 30s)
3. `unregister(taskId)`: clear timer, remove from map

### Startup Recovery

On server start, query DB for all non-terminal tasks and re-register them:
```sql
SELECT id, user_id, status FROM generation_tasks 
WHERE deleted_at IS NULL AND status NOT IN ('SUCCEEDED', 'FAILED', 'CANCELED', 'UNKNOWN')
```

### Broadcasting via PresenceManager

`TaskPoller` needs access to the WS broadcast function. Use the same `presenceManager.setBroadcaster()` pattern — or inject a separate publish function.

## Backend: Creativity Pipeline Integration

### Modify: `services/api/src/modules/creativity/service.ts`

In `runPipeline()`, after each `updateTask()` call (which updates DB), add a WS push:
```ts
await updateTask(taskId, { status: 'RUNNING', step: 0 })
presenceManager.broadcast({ type: 'task_updated', task: toTaskResponse(updated) })
```

But `presenceManager.broadcast` publishes to `presence` topic — we need to publish to `task:<userId>` instead. So add a dedicated method or use a different channel.

### Design decision: Use a shared `taskBroadcast` function

Inject a `taskBroadcast(userId: string, msg: TaskMessage)` function into both `TaskPoller` and `CreativityService`. The WS route sets this up on first connection (same pattern as presence broadcaster).

## Frontend Changes

### Modify: `apps/generate/src/hooks/useGenerate.ts`

- **Remove**: `POLL_INTERVAL`, `pollTask()`, `timers` ref, polling `useEffect`
- **Add**: Listen for `task_updated` WS messages in `usePresence` hook (or a separate `useTaskSync` hook)
- On `task_updated`: if task ID exists in local state → replace it; if terminal → no action needed (already updated)

### New Hook: `packages/shared/src/presence/useTaskSync.ts`

```ts
function useTaskSync(onTaskUpdated: (task: TaskResponse) => void): void
```

This hook listens on the shared WebSocket for `task_updated` messages and calls the callback. It accesses the same WebSocket connection from `usePresence`.

Actually, better: extend `usePresence` to also return task-related callbacks, or make the WS connection a shared singleton.

### Design decision: Merge into `usePresence`

Extend `usePresence` to also accept an `onTaskUpdated` callback:
```ts
function usePresence(onTaskUpdated?: (task: TaskResponse) => void): {
  onlineUsers: PresenceUser[]
}
```

This keeps the single WS connection and avoids creating a second hook that competes for the same WebSocket.

### Modify: `apps/creativity/src/hooks/useCreativity.ts`

Same as generate — remove `POLL_INTERVAL`, `pollTask`, timers, add WS message handling via `usePresence`.

### Fallback: HTTP polling as degraded mode

```ts
// In usePresence:
ws.onclose = () => {
  // If WS disconnects, the generate hook falls back to HTTP polling
  onWsDisconnect?.()
}
```

`useGenerate` can provide a fallback `onWsDisconnect` that restarts HTTP-based polling at 8s intervals. When WS reconnects, stop the fallback polling.

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| CREATE | `services/api/src/modules/presence/task-poller.ts` | Server-side Bailian polling + WS push |
| MODIFY | `services/api/src/modules/presence/index.ts` | Add `task:<userId>` subscription, inject taskBroadcast |
| MODIFY | `services/api/src/modules/presence/manager.ts` | Add taskBroadcast support |
| MODIFY | `services/api/src/modules/generate/service.ts` | Call taskPoller.register() on task creation |
| MODIFY | `services/api/src/modules/creativity/service.ts` | Push task_updated on pipeline state changes |
| MODIFY | `packages/shared/src/presence/types.ts` | Add TaskMessage types |
| MODIFY | `packages/shared/src/presence/usePresence.ts` | Parse task_updated messages, add onTaskUpdated callback |
| MODIFY | `apps/generate/src/hooks/useGenerate.ts` | Remove HTTP polling, use WS push |
| MODIFY | `apps/creativity/src/hooks/useCreativity.ts` | Remove HTTP polling, use WS push |

## Edge Cases

- **Server restart**: TaskPoller re-registers all non-terminal tasks from DB on startup
- **WS disconnect**: Frontend falls back to HTTP polling (8s interval). When WS reconnects, stop HTTP polling.
- **Task created while WS disconnected**: Frontend falls back to HTTP polling for that task. WS reconnects → TaskPoller already registered → updates come via both paths; frontend deduplicates by task ID + status.
- **Multiple tabs**: Each tab has its own WS. Both subscribe to `task:<userId>`. Both receive updates. Both update local state. No conflicts.
- **Rapid status changes**: `lastStatus` tracking prevents duplicate pushes for same status.
- **Bailian query failure**: TaskPoller retries on next poll interval. No push on failure.

## Out of Scope

- Task history (list) auto-refresh via WS — still uses HTTP on mount / showAll toggle
- Task creation push (optimistic update already handles this)
- Cross-user task visibility
