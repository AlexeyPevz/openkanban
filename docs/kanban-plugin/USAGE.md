# Kanban Plugin Usage

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build core + plugin:

   ```bash
   npm run build
   ```

3. Run the automated test suite:

   ```bash
   npm run test
   ```

4. Verify TypeScript types:

   ```bash
   npm run typecheck
   ```

5. Bundle the plugin as a single ESM file (optional — for distribution):

   ```bash
   npm run bundle:plugin
   ```

   Output: `packages/plugin/dist/openkanban.plugin.mjs`

## Plugin tools

The plugin registers six tools available to AI agents:

| Tool | Description | Arguments |
|------|-------------|-----------|
| `kanban_load_board` | Load current board state from canonical task files | — |
| `kanban_move_task` | Move a task to a new status | `taskId`, `targetStatus` |
| `kanban_create_task` | Create a new task | `title`, `status?`, `priority?`, `assignee?` |
| `kanban_get_task` | Get detailed task information | `taskId` |
| `kanban_list_tasks` | List tasks with optional filters | `status?`, `priority?`, `assignee?` |
| `kanban_open_board` | Open the visual board in the desktop companion app | — |

### Valid statuses

`planned`, `active`, `review`, `done`, `blocked`, `parked`, `cancelled`

### Valid priorities

`low`, `medium`, `high`

## Canonical storage

- Board file: `.tasks/board.yml`
- Task files: `.tasks/tasks/*.md` (one markdown file per task)

All state is file-first. No database, no server state. Multiple consumers (plugin, desktop, sidecar) read/write the same files.

## Desktop companion app

The `kanban_open_board` tool launches the desktop companion app (Tauri 2 + Svelte 5) as a detached process:

1. Plugin resolves the `openkanban-desktop` binary from `~/.openkanban/bin/`.
2. Plugin checks `.tasks/.board-ui.lock` to prevent duplicate launches.
3. Plugin spawns the binary with `--directory <project-root>`.
4. Desktop starts the Node sidecar, which watches `.tasks/` for live file changes.
5. If the app is already running, a repeat launch rebinds it to the new project directory without restarting the sidecar process.

See [LAUNCH_CONTRACT.md](LAUNCH_CONTRACT.md) for the full launch/rebind protocol.

## Expected workflow

1. **Load the board** — `kanban_load_board` returns the current board snapshot with diagnostics.
2. **Create tasks** — `kanban_create_task` creates a new task file in `.tasks/tasks/`.
3. **Move tasks** — `kanban_move_task` transitions tasks through the lifecycle (e.g. `planned` → `active` → `review` → `done`).
4. **Inspect tasks** — `kanban_get_task` and `kanban_list_tasks` for querying task details.
5. **Open visual board** — `kanban_open_board` launches the desktop companion for visual management.
6. **Re-load** — after changes, `kanban_load_board` to refresh the board state.

## Runtime notes

- The plugin exposes `tool` from `@opencode-ai/plugin`.
- Host-specific UI surfaces (overlay, commands, hotkeys) are not currently available in the plugin execution environment. The desktop companion app provides the visual board instead.
- The capability matrix is documented in [opencode-capability-matrix.md](opencode-capability-matrix.md) for reference.
