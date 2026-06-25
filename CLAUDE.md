# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**uhyc** — A generative AI media creation platform (video, image, music) backed by Alibaba Cloud Bailian (百炼) Model Studio. Bun + Turborepo monorepo with two React apps and one Elysia backend.

## Commands

```bash
# Development
bun run dev          # Run `dev` in all workspaces via Turborepo
bun run build        # Build all workspaces via Turborepo
bun run lint         # Lint all workspaces via Turborepo
bun run typecheck    # Type-check all workspaces via Turborepo

# Backend (services/api)
cd services/api && bun run dev          # Start Elysia server on :3000
cd services/api && bun run test         # Run tests (Bun test runner)

# Frontend apps (apps/generate, apps/auth)
cd apps/generate && bun run dev         # Vite dev server on :5174
cd apps/generate && bun run build       # tsc -b && vite build
cd apps/generate && bun run lint        # oxlint (no config needed)
cd apps/generate && bun run preview     # vite preview

# Database (packages/db)
cd packages/db && bun run generate      # Drizzle Kit: generate migration
cd packages/db && bun run migrate       # Drizzle Kit: apply migrations
cd packages/db && bun run push          # Drizzle Kit: push schema (dev)
cd packages/db && bun run studio        # Drizzle Kit: open studio UI

# Infrastructure
docker compose up -d          # Start PostgreSQL (see compose.yaml)
docker compose down -v        # Reset DB (wipe volume)
```

## Monorepo Architecture

```
uhyc/
├── apps/
│   ├── auth/                 # React 19 + Vite — login/register/callback
│   └── generate/             # React 19 + Vite — AI media generation studio
├── packages/
│   ├── shared/               # @uhyc/shared — auth types, API client, React hooks, CSS tokens
│   ├── db/                   # @uhyc/db — Drizzle ORM schema, pg pool, migrations
│   └── bailian/              # @uhyc/bailian — model type system, API client, pricing
├── services/
│   └── api/                  # @uhyc/api — Elysia backend (:3000), auth + generate + upload modules
└── docs/
    └── bailian/              # Bailian API docs (Chinese)
```

All packages are consumed as source via Bun workspace protocol (`"workspace:*"`). No build step needed for packages — the consumer's bundler resolves TypeScript source directly.

## Key Architecture Patterns

### Frontend → Backend Communication

Both frontend apps proxy `/api/*` through Vite to `localhost:3000`. The Vite config rewrites `/api/*` → strip `/api` prefix before forwarding to the Elysia backend. Auth uses httpOnly cookies (`credentials: 'include'`). The auth hook (`useAuth` in `@uhyc/shared`) is shared across both apps.

### Generation Flow

1. **Frontend** fetches `/api/generate/catalog` — a hierarchical model registry returned as-is from `@uhyc/bailian`'s `ModelDefinition[]` arrays
2. **User** selects category → subCategory → model → fills params form (rendered from `FieldMeta[]`)
3. **On submit**: blob URLs are uploaded to backend (which forwards to OSS if configured), then a `POST /api/generate/tasks` is made
4. **Backend** (`GenerateService.create`): validates params via `@uhyc/bailian`'s `validateParams` → inserts PENDING row in Postgres → calls Bailian API → updates row with `bailianTaskId`
5. **Frontend** periodically polls `GET /api/generate/tasks/:id` which syncs Bailian status (`GenerateService.findOneAndSync`) and downloads results on SUCCEEDED

### Bailian Package (Core Domain Logic)

`@uhyc/bailian` is the model definition system — it is NOT just an API client:

- **Model type system** in `src/video/types.ts`: `FieldMeta`, `ModelDefinition`, `Category`, `FieldGroup`, `PricingUnit`, `PriceTier`, `ModelPricing`, etc.
- **Model registries**: `src/video/`, `src/image/`, `src/music/` — each exports `*Models` (grouped by subCategory) and `all*Models` (flat list). New models are added as `ModelDefinition` objects in the appropriate registry.
- **Two request body styles**: standard (flat key-value split into `input`/`parameters`) and multimodal (Chat-format `messages[]` for qwen-image-edit, qwen-t2i). Selected via `endpoint === '/services/aigc/multimodal-generation/generation'`.
- **Two response modes**: async (create task → poll `/tasks/:id`) and sync (result in POST response — used by qwen-image-edit).
- **Ref syntax**: `bracket-en` (`[Image 1]` only images) or `cn-prefixed` (图1/视频1 separately counted). Controls how prompt chips serialize.

### Auth System

- JWT-based with httpOnly cookie (`auth`), signed via `@elysia/jwt`, 7-day expiry.
- The `authPlugin` exposes an Elysia macro `isAuth` — routes opt in via `{ isAuth: true }` and receive `currentUser` in context.
- Passwords stored as bcrypt hashes in the `users` table. Password column is never projected into API responses.

### DB Schema (Drizzle ORM + PostgreSQL)

Two enums (`user_role`, `task_status`) and three tables:
- `users` — id, username, email, password (bcrypt), avatar, role, timestamps
- `generation_tasks` — user FK, bailian task ID, category/subCategory/model, params (jsonb), status, errorMessage, timestamps. Indexed on (userId, createdAt) and unique on bailianTaskId.
- `generation_task_files` — task FK, kind (e.g. 'primary'), sourceUrl (Bailian), storagePath (local or OSS URL), mimeType, sizeBytes, originalFilename

Connection pool is cached in `globalThis` to survive hot-reloads.

### File Storage

Two-tier: local disk (`STORAGE_DIR`, default `./storage/`) for dev, Aliyun OSS for production. Configured via `OSS_*` env vars. `isOSSConfigured()` checks whether all OSS env vars are set. Uploads go to `${OSS_UPLOAD_PREFIX}/uploads/{userId}/{uuid}.{ext}`, task results go to `${OSS_UPLOAD_PREFIX}/tasks/{taskId}/{uuid}.{ext}`.

### CSS Architecture

CSS is vanilla (no CSS-in-JS framework) with a design token system in `@uhyc/shared/src/styles/tokens.css` and `@uhyc/shared/src/styles/ui.css`. Component styles live in per-component `.css` files alongside the components.

## Important Technical Details

- **Bun** — Runtime, package manager, test runner. No Node.js `npm`/`yarn`/`pnpm`.
- **TypeScript ~6.0** — Targets ESNext, `verbatimModuleSyntax`, `bundler` module resolution, `noEmit` (Vite/Rolldown handles bundling).
- **React Compiler** — Enabled via `babel-plugin-react-compiler` (Babel preset in `@rolldown/plugin-babel`). React 19.
- **Oxlint** — Linting for frontend apps (`bun run lint`). No config file needed.
- **Preview (Vite)** — Run `bun run preview` to serve the production build locally.
- **.env** — Copy `.env.example` to `.env` at repo root. Backend loads it via `bun --env-file=../../.env`.
