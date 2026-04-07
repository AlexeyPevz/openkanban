# neon-tiger

Kanban plugin for agentic IDEs. File-first task management for AI agents.

## Packages

| Package | Description |
|---------|-------------|
| `@neon-tiger/core` | Domain logic: types, schemas, transitions, repository, discovery, watch |
| `@neon-tiger/plugin` | OpenCode plugin: tool registration, host adapter |
| `@neon-tiger/desktop` | Tauri desktop app (coming in M2) |

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

## Development

```bash
npm install
npm run build
npm run test
npm run typecheck
```

## Architecture

`.tasks/` directory is the single source of truth. All components read/write task files. No database, no server.

See [Architecture Spec](docs/superpowers/specs/2026-04-07-kanban-dual-architecture-design.md) for details.
