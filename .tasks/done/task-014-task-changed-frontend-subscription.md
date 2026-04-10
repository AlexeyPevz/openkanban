# Task 014 — Frontend subscription for `sidecar:task.changed`

## Milestone
- Milestone 2 — Live sync completion

## Slice
- Slice 2.1 — Notification chain (task 2.1.3)

## Результат
- **status**: success
- **summary**: Реализована подписка `subscribeTaskChanged()` на Tauri event `sidecar:task.changed` с дифференцированным refresh: partial refresh для `changeType: "changed"` (через `taskApi.get` + merge) и full `loadBoard()` для `added`/`removed`. Реализованы 3 fallback-пути (board не в success, RPC error, task не найден). TDD подход: 8 новых тестов.
- **files_changed**:
  - `packages/desktop/src/lib/stores/board.svelte.ts` — добавлена `subscribeTaskChanged()` (строки 78-115)
  - `packages/desktop/src/App.svelte` — подключена `subscribeTaskChanged()` в `onMount` рядом с `subscribeBoardChanged()`
  - `tests/desktop/stores.test.ts` — добавлен `describe('subscribeTaskChanged')` блок с 8 тестами (строки 267-516)
- **tests**: 169/169 passed (было 161, +8 новых), 10 skipped, 32 test files
- **blockers**: нет

## Что реализовано

### `subscribeTaskChanged()` в `board.svelte.ts`
- `listen('sidecar:task.changed', handler)` — подписка на Tauri event
- Event payload: `{ taskId: string, changeType: string }`
- `changeType: "added" | "removed"` → `loadBoard()` (full refresh)
- `changeType: "changed"`:
  1. Если `boardState.state !== 'success'` → fallback `loadBoard()`
  2. `taskApi.get(taskId)` — получить обновлённую карточку
  3. Если RPC error → fallback `loadBoard()`
  4. Если task не найден в текущем `boardState.tasks` → fallback `loadBoard()`
  5. Иначе: merge — заменить task по index в массиве

### Wiring в `App.svelte`
- Import: `subscribeBoardChanged, subscribeTaskChanged`
- `onMount`: обе подписки запускаются параллельно, cleanup через `Promise.then(unlisten)`

### Тесты (8 новых)
1. Calls listen with `sidecar:task.changed` event name
2. Returns unlisten function for cleanup
3. changeType "changed" does partial refresh (verify merge, no loadBoard call)
4. changeType "added" calls loadBoard
5. changeType "removed" calls loadBoard
6. Fallback: board not in success state → loadBoard
7. Fallback: taskApi.get fails → loadBoard
8. Fallback: task not found in current state → loadBoard

## Верификация
- `npx vitest run` — 169 passed, 10 skipped (32 files)
- `npx vitest run tests/desktop/stores.test.ts` — 32 passed
- Тип-чек: `packages/desktop/tsconfig.json` отсутствует (known issue), типы проверяются через vitest/svelte compiler

## Статус
- Done
