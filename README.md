# openkanban

Kanban plugin for agentic IDEs. File-first task management for AI agents.

## Packages

| Package | Description |
|---------|-------------|
| `@openkanban/core` | Domain logic: types, schemas, transitions, repository, discovery, watch, resources |
| `@openkanban/plugin` | OpenCode plugin: tool registration, host adapter, desktop launch |
| `@openkanban/sidecar` | JSON-RPC sidecar: board/task/resource methods, file watcher, stdio transport |
| `@openkanban/desktop` | Tauri 2 + Svelte 5 desktop kanban board |

## Plugin Tools

The plugin exposes six tools to AI agents:

| Tool | Description |
|------|-------------|
| `kanban_load_board` | Load current board state from canonical task files |
| `kanban_move_task` | Move a task to a new status (`planned` → `active` → `review` → `done`, etc.) |
| `kanban_create_task` | Create a new task with title, status, priority, assignee |
| `kanban_get_task` | Get detailed information about a specific task |
| `kanban_list_tasks` | List tasks with optional filters (status, priority, assignee) |
| `kanban_open_board` | Open the visual kanban board in the desktop companion app |

Valid statuses: `planned`, `active`, `review`, `done`, `blocked`, `parked`, `cancelled`.

## Desktop Companion App

Standalone Tauri 2 desktop application that connects to any project via the plugin's `kanban_open_board` tool or direct launch with `--directory`:

- **Svelte 5 frontend** — reactive board with drag-and-drop, keyboard shortcuts, theme switching
- **Node sidecar** — JSON-RPC server over stdio, file watcher for live updates
- **Resource model** — discover and assign resources (labels, milestones, members) from project config
- **Project switching** — runtime rebind without sidecar restart; sidebar for known-projects catalog
- **Accessibility** — WCAG AA: focus traps, ARIA landmarks, keyboard navigation, reduced motion support

### Running the Desktop App

```bash
npm install
npm run build:all        # Build core → sidecar → sidecar-bundle → desktop
npm run dev:desktop      # Dev mode with hot reload
```

### Keyboard Shortcuts

Active global shortcuts:

| Key | Action |
|-----|--------|
| `n` | New task |
| `Escape` | Close panel / form |
| `?` | Toggle shortcuts help |
| `t` | Toggle theme |

Press `?` in the app to see the full shortcuts help panel (includes planned shortcuts like `e`, `j`/`k`, `Ctrl+Z` that are not yet wired up).

## Development

```bash
npm install
npm run build            # Build core + plugin (TypeScript → dist/)
npm run build:all        # Build core + sidecar + sidecar-bundle + desktop
npm run bundle:plugin    # Bundle plugin as single ESM file (openkanban.plugin.mjs)
npm run test             # Run all tests (Vitest)
npm run typecheck        # TypeScript type check
```

> **Note:** `build` and `build:all` are independent paths. `build` produces the plugin; `build:all` produces the desktop app. Both require `core` to be built first.

## Architecture

`.tasks/` directory is the single source of truth. All components read/write task files. No database, no server state.

**Canonical storage:**
- Board: `.tasks/board.yml`
- Tasks: `.tasks/tasks/*.md`

```
packages/
  core/       — types, schemas, transitions, repository, resource model
  plugin/     — OpenCode plugin adapter
  sidecar/    — JSON-RPC stdio server, file watcher, methods
  desktop/    — Tauri 2 shell + Svelte 5 UI
    src-tauri/ — Rust sidecar management
    src/       — Svelte components, stores, actions
scripts/
  bundle-plugin.mjs — esbuild bundler for plugin ESM output
```

See [Architecture Spec](docs/superpowers/specs/2026-04-07-kanban-dual-architecture-design.md) for details.
