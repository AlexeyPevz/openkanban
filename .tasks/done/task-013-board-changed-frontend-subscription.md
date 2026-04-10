# Task 013 — Frontend subscription for `sidecar:board.changed`

## Результат
- Статус: завершено
- Outcome: desktop frontend подписан на `sidecar:board.changed`, и board-level live sync теперь доходит до UI через полный `loadBoard()`.

## Что сделано
- В `packages/desktop/src/lib/stores/board.svelte.ts` добавлена `subscribeBoardChanged()` через `listen('sidecar:board.changed', ...)`.
- При событии `sidecar:board.changed` вызывается полный `loadBoard()`.
- В `packages/desktop/src/App.svelte` добавлен root-level wiring подписки через `onMount()` и cleanup через returned unlisten function при unmount.
- В `tests/desktop/stores.test.ts` добавлены targeted tests на имя события, trigger `loadBoard()` и cleanup contract.

## Touched files
- `.tasks/in-progress/task-013-board-changed-frontend-subscription.md`
- `.tasks/done/task-013-board-changed-frontend-subscription.md`
- `packages/desktop/src/App.svelte`
- `packages/desktop/src/lib/stores/board.svelte.ts`
- `tests/desktop/stores.test.ts`

## Верификация
- `npm test -- tests/desktop/stores.test.ts` → 24 passed
- `npm run build -w packages/desktop` → build successful
- `npm test` → 32 files passed, 161 tests passed, 0 failed

## Review
- Spec review → success
- Quality review → success; blocker-level проблем не найдено

## Следующий task
- Task 2.1.3 — подписать desktop frontend на `sidecar:task.changed` с partial refresh для `changeType: changed` и full refresh для `added`/`removed`.
