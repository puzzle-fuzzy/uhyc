# uhyc

A Bun workspace monorepo.

## Structure

```
uhyc/
├── apps/               # Applications (backend, frontend, ...)
│   ├── backend/        # Backend service
│   └── frontend/       # Frontend application
├── packages/           # Shared libraries
│   └── shared/         # Shared types, utilities, configs
├── package.json        # Root workspace config
├── tsconfig.base.json  # Shared TS config
└── bunfig.toml         # Bun config
```

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `bun run dev`        | Run `dev` in every workspace         |
| `bun run build`      | Build every workspace                |
| `bun run typecheck`  | Type-check every workspace           |

## Adding a workspace

Drop a new package with a `package.json` under `apps/` or `packages/` and Bun
will pick it up automatically. Reference other workspaces via the `workspace:*`
protocol, e.g.:

```jsonc
"dependencies": {
  "@uhyc/shared": "workspace:*"
}
```
