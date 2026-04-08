# neon-tiger

Kanban plugin for agentic IDEs. File-first task management for AI agents.

## Packages

| Package | Description |
|---------|-------------|
| `@neon-tiger/core` | Domain logic: types, schemas, transitions, repository, discovery, watch |
| `@neon-tiger/plugin` | OpenCode plugin: tool registration, host adapter |
| `@neon-tiger/sidecar` | JSON-RPC sidecar: board/task/resource methods, file watcher, stdio transport |
| `@neon-tiger/desktop` | Tauri 2 + Svelte 5 desktop kanban board |

## Quick Start

```bash
# Install the OpenCode plugin
opencode plugin install neon-tiger/neon-tiger

# Tools available to agents:
# kanban_load_board    — load board state
# kanban_move_task     — move task to new status
# kanban_create_task   — create a new task
# kanban_get_task      — get task details
# kanban_list_tasks    — list tasks with filters
# kanban_open_board    — open visual board (requires desktop app)
```

## Desktop App (M2)

Standalone Tauri 2 desktop application with:

- **Svelte 5 frontend** — reactive board with drag-and-drop, keyboard shortcuts, theme switching
- **Node sidecar** — JSON-RPC server over stdio, file watcher for live updates
- **Resource model** — discover and assign resources (labels, milestones, members) from project config
- **Accessibility** — WCAG AA: focus traps, ARIA landmarks, keyboard navigation, reduced motion support

### Running the Desktop App

```bash
npm install
npm run build:all        # Build core → sidecar → desktop
npm run dev:desktop      # Dev mode with hot reload
```

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | New task |
| `e` | Edit selected task |
| `Enter` | Open task details |
| `Escape` | Close panel / Cancel |
| `j` / `k` | Navigate cards |
| `1-5` | Jump to column |
| `Ctrl+Z` | Undo last action |

## Development

```bash
npm install
npm run build            # Build core + plugin
npm run build:all        # Build core + sidecar + desktop
npm run test             # Run all tests (Vitest)
npm run typecheck        # TypeScript type check
```

## Architecture

`.tasks/` directory is the single source of truth. All components read/write task files. No database, no server state.

```
packages/
  core/       — types, schemas, transitions, repository, resource model
  plugin/     — OpenCode plugin adapter
  sidecar/    — JSON-RPC stdio server, file watcher, methods
  desktop/    — Tauri 2 shell + Svelte 5 UI
    src-tauri/ — Rust sidecar management
    src/       — Svelte components, stores, actions
```

See [Architecture Spec](docs/superpowers/specs/2026-04-07-kanban-dual-architecture-design.md) for details.
