# Task 006 — Browser-safe boundary для desktop bundle

## Result
- **status**: success
- **summary**: Устранён root cause чёрного экрана desktop. Создан browser-safe `task-resources.ts` helper в desktop пакете с инлайн `normalizeResources` логикой. Card.svelte и TaskDetails.svelte переведены на локальный helper. Board-store.ts в core рефакторнут: UI-helpers вынесены в task-helpers.ts. Собранный browser bundle не содержит Node-only импортов.
- **files_changed**:
  - `packages/desktop/src/lib/task-resources.ts` (NEW — browser-safe helper)
  - `packages/core/src/ui/task-helpers.ts` (NEW — extracted UI helpers)
  - `packages/core/src/browser.ts` (NEW — browser entry point)
  - `packages/core/src/ui/board-store.ts` (MODIFIED — re-exports from task-helpers.ts)
  - `packages/desktop/src/lib/components/Card.svelte` (MODIFIED — local import)
  - `packages/desktop/src/lib/components/TaskDetails.svelte` (MODIFIED — local import)
  - `vitest.config.ts` (MODIFIED — alias for tests)
  - `tests/desktop/task-resources.test.ts` (NEW — TDD test)
- **tests**: 152 passed, 0 failed. `tests/desktop/task-resources.test.ts` GREEN.
- **blockers**: нет
- **next_steps**: E2E verify `kanban_open_board` через live plugin; push to origin

## Commit
- `7bd8b55` — `fix(desktop): eliminate Node-only imports from WebView browser bundle`

## Верификация
- ✅ RED test написан и подтверждён falling
- ✅ GREEN реализация — тест проходит
- ✅ Desktop bundle собран (`npm run build -w packages/desktop`)
- ✅ grep по `packages/desktop/dist/assets/*.js` — 0 совпадений на `node:`, `fs`, `path`, `os`, `crypto`
- ✅ Все 152 теста зелёные
