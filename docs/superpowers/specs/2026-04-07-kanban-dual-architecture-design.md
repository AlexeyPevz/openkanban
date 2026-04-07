# Kanban Dual Architecture Design

**Date:** 2026-04-07
**Status:** approved
**Supersedes:** 2026-03-26-kanban-plugin-design.md (MVP-only scope)

## Overview

Two-component architecture for the neon-tiger kanban system:

1. **OpenCode Plugin** (`@neon-tiger/plugin`) — headless, tool-first plugin running inside OpenCode's sandboxed Node process. Provides kanban tools to AI agents.
2. **Tauri Desktop App** (`@neon-tiger/desktop`) — standalone native desktop application with a visual kanban board. Launched from OpenCode via plugin tool call.

Both components share a common domain layer (`@neon-tiger/core`) and communicate exclusively through the file system — the `.tasks/` directory is the single source of truth.

## Architecture

### Monorepo Structure

```
neon-tiger/
├── packages/
│   ├── core/                        # shared domain (types, schemas, repo, transitions)
│   ├── plugin/                      # OpenCode plugin (headless, tool-first)
│   └── desktop/                     # Tauri app (Rust shell + vanilla webview)
├── package.json                     # npm workspace root
└── .tasks/                          # kanban data (file-system = database)
```

### Package Roles

| Package | Role | Runtime |
|---------|------|---------|
| `@neon-tiger/core` | Types, schemas, state transitions, repository, discovery, watch, bridge | Node (isomorphic) |
| `@neon-tiger/plugin` | OpenCode plugin entry, tool registration, launches desktop app | Node (OpenCode sandbox) |
| `@neon-tiger/desktop` | Tauri shell + webview frontend, visual kanban board | Rust + Browser (vanilla DOM) |

### Communication

- **File system only** — `.tasks/` directory is the protocol
- Plugin writes to `.tasks/` via core repository layer
- Desktop reads `.tasks/` and watches for changes via chokidar (already implemented)
- Desktop writes to `.tasks/` — plugin sees changes through watcher
- **No IPC, WebSocket, or HTTP between plugin and desktop**

### Plugin Launches Desktop

- Tool `kanban_open_board` calls `child_process.spawn` with path to Tauri binary
- Passes `--directory <path>` as argument so app knows which `.tasks/` to open
- Lock-file or PID check prevents launching duplicates

## Package: @neon-tiger/core

Extracted from the existing `src/` directory (minus `plugin.ts`, `host/opencode/`, and `ui/`).

### Contents

```
packages/core/src/
├── types.ts                          # TaskCard, TaskStatus, Board
├── schemas/                          # Zod validation
├── transitions/                      # state machine (planned→active→review→done...)
├── preflight/                        # gate checks before transition
├── events/                           # task-event.ts
├── contract/                         # execution contract
├── agents/                           # agent registry types
├── discovery/                        # source candidates, primary selection
├── repository/
│   ├── canonical/                    # board-yaml, task-markdown (read)
│   ├── write/                        # create-task, update-task, update-task-status
│   └── fallback/                     # fallback adapters
├── watch/                            # board-watcher (chokidar)
└── bridge/orchestrator/              # runtime-publisher, publish-task-event
```

### Key Decisions

- `chokidar` remains a core dependency — both plugin and desktop use the watcher
- Repository layer uses Node `fs` — this is fine because desktop accesses it through a Node sidecar, not directly from webview
- Node sidecar (not NAPI/WASM) because core depends on chokidar and Node `fs`; porting to Rust/WASM is out of scope for MVP
- Clean public API via barrel `index.ts` export

### Migration Notes

The existing flat `src/` structure maps to `packages/core/src/` as-is. Some files are single modules, not directories (e.g., `schemas.ts` not `schemas/`). The implementation plan will use actual file names from the current codebase. Files from `src/host/opencode/` that are not listed in the plugin package (`register-hotkeys.ts`, `register-commands.ts`, `emit-capability-matrix.ts`) are removed as dead code — OpenCode SDK does not support hotkeys or commands registration.

## Package: @neon-tiger/plugin

Headless plugin living inside OpenCode's sandboxed Node process.

### Contents

```
packages/plugin/src/
├── plugin.ts                         # entry point, Plugin export
├── tools/
│   ├── load-board.ts                 # kanban_load_board (existing)
│   ├── move-task.ts                  # kanban_move_task (existing)
│   ├── create-task.ts                # NEW: kanban_create_task
│   ├── get-task.ts                   # NEW: kanban_get_task
│   ├── list-tasks.ts                 # NEW: kanban_list_tasks
│   └── open-board.ts                 # NEW: kanban_open_board (launch Tauri app)
└── host/
    ├── adapter.ts                    # OpenCode adapter
    ├── probe-capabilities.ts
    └── runtime-context.ts
```

### Tools

| Tool | Description | Args |
|------|-------------|------|
| `kanban_load_board` | Load board state from task files | — |
| `kanban_move_task` | Move task to new status | `taskId`, `targetStatus` |
| `kanban_create_task` | Create a new task | `title`, `status?`, `priority?`, `assignee?` |
| `kanban_get_task` | Get task details | `taskId` |
| `kanban_list_tasks` | List tasks with filters | `status?`, `assignee?`, `priority?` |
| `kanban_open_board` | Launch visual kanban board | — (uses `directory` from context) |

### kanban_open_board Logic

1. Resolve path to Tauri binary — default convention: look up `neon-tiger-desktop` in `PATH`; fallback to `~/.neon-tiger/bin/`; override via plugin config `desktopBinaryPath`
2. Check lock-file (`<directory>/.tasks/.board-ui.lock`) — if app is already running, skip launch
3. `child_process.spawn(binaryPath, ['--directory', directory], { detached: true })`
4. Return to agent: `"Kanban board opened in desktop app"`

### package.json

```json
{
  "name": "@neon-tiger/plugin",
  "main": "./dist/plugin.js",
  "exports": { ".": "./dist/plugin.js" },
  "files": ["dist"],
  "dependencies": {
    "@neon-tiger/core": "workspace:*",
    "@opencode-ai/plugin": "^1.3.2"
  }
}
```

## Package: @neon-tiger/desktop

Standalone Tauri desktop application. Rust shell + vanilla JS webview + Node sidecar.

### Structure

```
packages/desktop/
├── src-tauri/
│   ├── Cargo.toml                    # Tauri + sidecar config
│   ├── src/
│   │   ├── main.rs                   # Tauri entry, register commands
│   │   └── commands.rs               # IPC commands (proxy to sidecar)
│   ├── tauri.conf.json               # window config, sidecar declaration
│   └── icons/
├── src-sidecar/
│   ├── index.ts                      # Node sidecar entry
│   ├── server.ts                     # stdin/stdout JSON-RPC with Tauri
│   └── handlers/                     # load-board, move-task, create-task, watch
├── src-webview/
│   ├── index.html
│   ├── main.ts                       # entry, init app
│   ├── tauri-bridge.ts               # invoke() wrapper for IPC
│   ├── ui/                           # MOVED from existing src/ui/
│   │   ├── state/board-store.ts
│   │   ├── view/                     # render-board, render-card, render-column, ...
│   │   └── interactions/             # drag-drop, keyboard, details, form
│   └── styles/
│       └── board.css                 # board styles
└── package.json
```

### Data Flow

```
┌─────────────────────────────────────────────┐
│  Tauri App                                  │
│                                             │
│  ┌──────────┐    invoke()    ┌───────────┐  │
│  │ Webview  │ ◄────────────► │ Rust      │  │
│  │ (vanilla │    IPC         │ backend   │  │
│  │  DOM)    │                │           │  │
│  └──────────┘                └─────┬─────┘  │
│                                    │        │
│                              stdin/stdout    │
│                              JSON-RPC        │
│                                    │        │
│                              ┌─────▼─────┐  │
│                              │ Node      │  │
│                              │ sidecar   │  │
│                              │ (@neon-   │  │
│                              │  tiger/   │  │
│                              │  core)    │  │
│                              └─────┬─────┘  │
│                                    │        │
└────────────────────────────────────┼────────┘
                                     │
                              ┌──────▼──────┐
                              │  .tasks/    │
                              │  (files)    │
                              └─────────────┘
```

### Scenario

1. User (or agent) calls `kanban_open_board` → plugin spawns Tauri app
2. Tauri app starts Node sidecar, passes `--directory`
3. Sidecar loads board via `@neon-tiger/core`, starts watcher
4. Webview gets initial state via `invoke('load_board')`
5. On file changes — sidecar notifies Rust → Rust pushes event to webview
6. On drag-drop in webview — `invoke('move_task')` → Rust → sidecar → core → files
7. Files change → plugin (if watching) sees changes too

### Frontend

- **Vanilla DOM** — reuse all 10 existing UI files from `src/ui/`
- No framework dependency for MVP
- Potential migration to Svelte in a later milestone if needed

## Installation (Target UX)

```bash
# 1. Install plugin in OpenCode
opencode plugin install neon-tiger/neon-tiger

# 2. Download Tauri app (GitHub Releases — platform binary)
# Windows: neon-tiger-desktop-x64.msi
# macOS:   neon-tiger-desktop-aarch64.dmg
# Linux:   neon-tiger-desktop-amd64.AppImage

# 3. Use
# Agents call kanban_load_board, kanban_move_task, kanban_create_task
# Or: kanban_open_board → opens visual board
```

## Build

```bash
# root package.json workspaces
npm run build:core      # tsc → packages/core/dist/
npm run build:plugin    # tsc → packages/plugin/dist/
npm run build:desktop   # vite build + cargo tauri build
npm run test            # vitest across all packages
```

## Milestones

| # | Milestone | Scope | Deliverable |
|---|-----------|-------|-------------|
| **M1** | Monorepo + plugin production | Restructure to monorepo, new tools, package.json, README, GitHub publish | Working plugin, `opencode plugin install` |
| **M2** | Tauri desktop MVP | Tauri shell, Node sidecar, move UI, basic board view with minimal working styles, drag-drop | Board opens, tasks can be moved, visually usable |
| **M3** | Polish | Branding, icons, auto-refresh, advanced error handling, GitHub Releases with platform binaries | Production-ready desktop app |
