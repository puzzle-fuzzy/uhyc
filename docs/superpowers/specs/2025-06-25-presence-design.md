# Online Presence — Design Spec

## Overview

Real-time "who's online" display in the top header bar. Users see their teammates' avatars when they have the app open, creating a sense of shared space. Pure display — no interaction, no chat, just awareness.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Online definition | WebSocket connection open | Simplest, most real-time. Natural disconnect = offline mapping |
| Scope | Global across all apps | Same presence list in generate and creativity |
| Avatar style | Text initials, colored circle | No image upload needed. Color assigned by username hash |
| Interaction | None — display only | Keep it simple, no feature creep |
| Multi-tab | Reference counting | Same userId → one avatar. All tabs close → remove |
| Max display | 5 avatars + "+N" overflow | Prevents header crowding |
| Position | Right side of header, left of current user info | Between brand logo and own avatar |

## Architecture

```
┌─ generate (5174) ─┐    ┌─ creativity (5175) ─┐
│  usePresence()      │    │  usePresence()       │
│       ↕ WebSocket   │    │       ↕ WebSocket    │
└────────┬────────────┘    └────────┬─────────────┘
         │                          │
         └──────────┬───────────────┘
                    │ ws://localhost:3000/ws/presence
                    ▼
         ┌──────────────────────────┐
         │  Elysia WebSocket Server │
         │  PresenceManager         │
         │  Map<userId, Presence>   │
         │  - refCount              │
         │  - broadcast on change   │
         └──────────────────────────┘
```

## Data Flow

1. User opens page → `usePresence` hook establishes WebSocket to `/ws/presence`
2. Server authenticates via JWT from cookie → extracts userId
3. Server increments refCount. If new (refCount 0→1): broadcast `user_joined { userId, username, role }`
4. All connected clients receive message → add avatar to online list
5. User closes tab → WebSocket disconnects → server decrements refCount. If refCount hits 0: broadcast `user_left { userId }`
6. All clients remove the avatar

New connections receive a `snapshot` message with the full current online list to initialize.

## WebSocket Protocol

### Server → Client Messages

```ts
type PresenceMessage =
  | { type: 'snapshot'; users: { userId: string; username: string; role: string }[] }
  | { type: 'user_joined'; userId: string; username: string; role: string }
  | { type: 'user_left'; userId: string }
```

### Client → Server

Client sends nothing except the initial connection (auth via cookie). No heartbeat needed — Bun/TCP handles connection liveness.

## Files

### New Files

| File | Purpose |
|------|---------|
| `services/api/src/modules/presence/manager.ts` | `PresenceManager` class — Map-based online user tracking with refCount and broadcast |
| `services/api/src/modules/presence/index.ts` | Elysia WebSocket route at `/ws/presence` |
| `packages/shared/src/presence/types.ts` | `PresenceUser` type, `PresenceMessage` types |
| `packages/shared/src/presence/usePresence.ts` | React hook — WebSocket connection, onlineUsers state |

### Modified Files

| File | Change |
|------|--------|
| `services/api/src/index.ts` | Register presence WS module |
| `apps/generate/src/App.tsx` | Render `<OnlineAvatars>` in header |
| `apps/generate/src/App.css` | Online avatar group styles |
| `apps/creativity/src/App.tsx` | Same as generate |
| `apps/creativity/src/App.css` | Same as generate |

### Existing Files (no changes, just reference)

- `packages/shared/src/auth/useAuth.ts` — presence hook uses auth cookie for WS connection
- `services/api/src/plugins/jwt.ts` — JWT verification for WS auth
- `packages/shared/src/styles/tokens.css` — CSS variables for avatar colors

## PresenceManager API

```ts
class PresenceManager {
  join(userId: string, username: string, role: string, ws: ServerWebSocket): void
  leave(userId: string): void
  getSnapshot(): PresenceUser[]
  broadcast(msg: PresenceMessage): void
}
```

- `join`: increments refCount; if was 0, broadcasts `user_joined` then sends `snapshot` to the new connection
- `leave`: decrements refCount; if now 0, broadcasts `user_left`
- `getSnapshot`: returns all current online users
- Connections stored per userId in a `Map<string, Set<ServerWebSocket>>` for multi-tab support

## WebSocket Auth

The WebSocket upgrade request carries the `auth` cookie (httpOnly). Server verifies the JWT on connection:

1. Parse cookie from upgrade request headers
2. Verify JWT signature
3. Extract `{ sub: userId, role }`
4. If invalid → close connection with code 4001
5. If valid → call `presenceManager.join(userId, username, role, ws)`

Username lookup: on first join, fetch from DB by userId. Cache in the presence entry to avoid repeated queries.

## Frontend Hook API

```ts
function usePresence(): { onlineUsers: PresenceUser[] }

interface PresenceUser {
  userId: string
  username: string
  role: string
}
```

- Establishes WebSocket on mount, closes on unmount
- Handles reconnection (exponential backoff: 1s, 2s, 4s, max 30s)
- Returns `onlineUsers` state (excludes self)
- Silent failure — if WS fails, just shows empty list

## UI Design

```
┌──────────────────────────────────────────────────────────────┐
│  [logo] uhyc·generate     [🟣A] [🟢B] [🔵C] [+2] │ [🟡我] 用户名 登出 │
│                           ←── online avatars ──→ │ ← current user → │
└──────────────────────────────────────────────────────────────┘
```

- Avatar size: 36px circle, matching existing `.topbar__avatar`
- Colors: 8-color palette, assigned by hashing username → consistent per user
- Max visible: 5 avatars, rest shown as `+N` gray circle
- `+N` circle on hover shows tooltip with overflow usernames
- Self excluded from online list
- CSS transition on add/remove (opacity + scale, 200ms)

## Color Palette

```css
--presence-0: #6366f1;  /* indigo */
--presence-1: #8b5cf6;  /* violet */
--presence-2: #ec4899;  /* pink */
--presence-3: #f43f5e;  /* rose */
--presence-4: #f97316;  /* orange */
--presence-5: #eab308;  /* yellow */
--presence-6: #22c55e;  /* green */
--presence-7: #06b6d4;  /* cyan */
```

## Edge Cases

- **WS connection fails**: Hook catches error, returns empty `onlineUsers`. No crash, no error banner.
- **JWT expires while connected**: Next reconnect attempt fails auth → graceful offline. Original connection stays until TCP close.
- **Server restart**: All WS connections drop. Frontend reconnect backs off exponentially.
- **Rapid connect/disconnect** (tab spam): RefCount prevents flickering — user stays "online" until all tabs close.
- **Same user, different apps**: Both tabs share the same userId, refCount = 2. Both must close to go offline.

## Out of Scope

- Image avatar upload
- Click-to-interact / user profile cards
- Activity tiers (active vs idle)
- Presence in auth app (no header there)
- Admin-only presence visibility
- Per-app presence isolation
