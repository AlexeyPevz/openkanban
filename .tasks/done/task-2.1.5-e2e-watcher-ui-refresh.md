## Milestone
- Milestone 2 — Live sync completion

## Slice
- Slice 2.1 — Notification chain

## Task
- Task 2.1.5 — проверить end-to-end watcher → UI refresh

## Результат
- **status**: success
- **summary**: Добавлен один интеграционный desktop-тест, который проверяет end-to-end frontend-visible цепочку `sidecar:task.changed` → Tauri listener wiring → partial refresh через `taskApi.get` → update store → update derived UI state (`getSelectedTask`, `getTasksByStatus`) без `loading` flash. Production code менять не понадобилось.
- **files_changed**:
  - `tests/desktop/stores.test.ts`
  - `.tasks/done/task-2.1.5-e2e-watcher-ui-refresh.md`
- **tests**:
  - `npx vitest run tests/desktop/stores.test.ts` → 36/36 passed
  - `npx vitest run` → 173 passed, 10 skipped, 0 failed
- **blockers**: нет
- **next_steps**: перейти к следующему task из Milestone 3 или зафиксировать изменения отдельным git commit по запросу пользователя

## Что сделано
- Добавлен `describe('e2e watcher → UI refresh')` с одним тестом:
  - `sidecar task.changed event updates board, selectedTask and tasksByStatus without loading flash`
- Тест моделирует реальный runtime-visible сценарий:
  - board сначала загружен в `success`
  - пользователь выбрал task через `selectTask('t1')`
  - обе подписки активированы так же, как это делает `App.svelte` в `onMount`
  - приходит событие `sidecar:task.changed` с `changeType: 'changed'`
  - store делает partial refresh через `taskApi.get(taskId)` и merge в `boardState`
  - derived UI state (`getSelectedTask`, `getTasksByStatus`) отражает новое состояние
  - во время обновления не происходит перехода в `loading`
- Scope намеренно сужен до одного лучшего сценария: full refresh paths уже отдельно покрыты существующими тестами `subscribeBoardChanged` и `subscribeTaskChanged`.

## Почему этого достаточно для Task 2.1.5
- Этот тест закрывает именно интеграционный уровень выше unit-тестов подписок:
  - не просто проверяет вызов `listen(...)`
  - не только проверяет вызов `refreshBoard()`/`taskApi.get()`
  - а доказывает, что после sidecar/Tauri события пользовательски наблюдаемое состояние UI действительно меняется корректно.

## Верификация
- Независимая оркестраторская проверка после работы подагента:
  - `git diff -- tests/desktop/stores.test.ts .tasks/in-progress/task-2.1.5-e2e-watcher-ui-refresh.md`
  - `npx vitest run tests/desktop/stores.test.ts`
  - `npx vitest run`

## Статус
- Done
