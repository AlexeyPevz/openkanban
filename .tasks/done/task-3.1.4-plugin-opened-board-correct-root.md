# Task 3.1.4: Verify plugin-opened board uses correct project root

**Status:** done
**Milestone:** 3 — OpenCode companion integration
**Slice:** 3.1 — Launch and current project binding

## Goal

Проверить end-to-end launch path на уровне контракта:

- plugin передаёт корректный `--directory`;
- initial root resolution берёт именно launch-проект (а не случайный cwd);
- board открывается с правильным project context.

## What was done

1. Added integration test:
   - `tests/integration/launch/plugin-opened-board-root.test.ts`
2. Test scenario validates:
   - `makeOpenBoardHandler` вызывает `spawnDetached` с `['--directory', <project>]`;
   - `resolveInitialProjectRoot` выбирает этот путь как initial sidecar root при
     наличии `OPENKANBAN_PROJECT_DIR`.
3. Updated launch contract docs test coverage section:
   - `docs/kanban-plugin/LAUNCH_CONTRACT.md`

## Verification

- `npx vitest run tests/integration/launch/plugin-opened-board-root.test.ts`

Result: passed.

## Files changed (3.1.4 scope)

- `tests/integration/launch/plugin-opened-board-root.test.ts`
- `docs/kanban-plugin/LAUNCH_CONTRACT.md`
- `.tasks/done/task-3.1.4-plugin-opened-board-correct-root.md`
