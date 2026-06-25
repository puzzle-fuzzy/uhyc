# Unblock Generate Button Design

## Context

当前"生成"按钮在任务提交期间被 `submitting` 状态禁用，用户需要等待百炼返回结果后才能再次点击。对于希望批量提交多个任务的场景，这种串行等待是不必要的——右侧面板的轮询机制已经能独立跟踪每个任务的状态。

## Goal

移除按钮上因 `submitting` 导致的禁用，使上传完成后按钮立即恢复可用，不再受百炼任务状态的限制。

## Changes

### GeneratorPanel.tsx

Three guard points to modify:

| Location | Before | After |
|---|---|---|
| `handleSubmit` entry guard | `if (!model \|\| uploading \|\| submitting) return` | `if (!model \|\| uploading) return` |
| Button `disabled` | `!model \|\| submitting \|\| uploading` | `!model \|\| uploading` |
| Button text | `uploading ? '上传素材中…' : submitting ? spinner : '生成'` | `uploading ? '上传素材中…' : '生成'` |

### Behavior

- **Uploading OSS 期间**: 按钮保持禁用，显示"上传素材中…"（防止并发上传冲突）
- **Uploading 完成 → 任务提交**: 调用 `submit()` 后立即恢复按钮可用，不等百炼响应
- **按钮始终可用**: 只要没有正在上传的素材，按钮永远可点击
- **任务状态展示**: 右侧"生成记录"面板通过已有轮询机制展示每个任务的状态（`PENDING` → `RUNNING` → `SUCCEEDED`/`FAILED`）

### What Does NOT Change

- `uploading` 状态的设置/清除逻辑
- `submitting` 状态在 `useGenerate` 内部的设置/清除（仍用于错误处理，但不再影响 UI）
- 轮询机制（`pollTask`）
- 任务列表增删逻辑
- 错误提示逻辑

## Verification

1. 快速点击两次"生成"，确认两个任务都能提交，且在右侧面板中分别展示各自状态
2. 确认上传素材时按钮仍然禁用
3. 确认无素材上传时按钮始终可点击
