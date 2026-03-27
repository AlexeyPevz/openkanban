# Kanban Plugin Usage

## Local development

1. Install dependencies:

   `npm install`

2. Run the automated test suite:

   `npm run test`

3. Verify TypeScript types:

   `npm run typecheck`

4. Build the plugin bundle:

   `npm run build`

5. Generate the current OpenCode capability matrix:

   `npm run probe:opencode`

## Runtime notes

- Current verified `@opencode-ai/plugin` surface exposes `tool`.
- Live-host-only surfaces are currently documented in `opencode-capability-matrix.md` as `unsupported-by-environment` in this execution environment.
- The plugin remains file-first: task state is persisted in `.tasks/board.yml` and `.tasks/tasks/*.md`.

## Provided plugin tools

- `kanban_load_board` — returns the current board snapshot
- `kanban_move_task` — moves a task to a target status using canonical task files

## Canonical storage

- Board file: `.tasks/board.yml`
- Task files: `.tasks/tasks/*.md`

## Expected workflow

1. Load the board state.
2. Move tasks through `planned`, `active`, `review`, `done`, `blocked` as needed.
3. Let preflight and kanban contract rules block invalid transitions.
4. Re-load board state to inspect the updated task lifecycle.
