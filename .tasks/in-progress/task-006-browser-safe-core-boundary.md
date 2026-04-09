# Task 006 — Browser-safe boundary для desktop bundle

## Milestone
- M2 Desktop black screen recovery

## Slice
- Убрать Node-only импорты из browser bundle desktop-приложения

## Цель
- Исправить root cause черного экрана: desktop WebView не должен импортировать Node-only модули через `@openkanban/core`.

## Входные файлы
- `AGENTS.md`
- `.tasks/in-progress/task-005-desktop-black-screen-debug.md`
- `.tasks/done/task-005-desktop-black-screen-debug.md`
- `packages/core/src/index.ts`
- `packages/core/src/ui/board-store.ts`
- `packages/core/package.json`
- `packages/desktop/src/lib/components/Card.svelte`
- `packages/desktop/src/lib/components/TaskDetails.svelte`
- `packages/desktop/src/lib/components/TaskForm.svelte`
- `packages/desktop/src/lib/stores/{board.svelte.ts,resources.svelte.ts}`
- `packages/desktop/src/lib/rpc.ts`

## Подтвержденный root cause
- `Card.svelte` и `TaskDetails.svelte` импортируют `@openkanban/core`.
- Barrel `packages/core/src/index.ts` смешивает browser-safe exports и Node-only repository/watch/write exports.
- В результате `packages/desktop/dist/assets/*.js` содержит `node:fs/promises`, `node:path` и другие Node built-ins.

## Ограничения
- Не делать широкий рефакторинг сверх нужного для browser-safe boundary.
- Сначала RED test / reproducible check, потом минимальный фикс.
- Сохранить текущие public contracts настолько, насколько это разумно для bounded fix.

## Варианты решения
- Предпочтительно: вынести browser-safe helper/entrypoint и перевести desktop на него.
- Допустимо: локализовать helper в desktop, если это самый маленький и безопасный фикс.
- Нежелательно: оставлять desktop зависимым от barrel `@openkanban/core` там, где нужен runtime import.

## Критерии готовности
- Browser bundle desktop больше не содержит Node-only imports из-за `@openkanban/core` runtime path.
- `npm run build:all` или эквивалентный релевантный build проходит.
- Есть проверка/доказательство, что `packages/desktop/dist/assets/*.js` больше не содержит `node:fs/promises` / `node:path`.
- Desktop black-screen root cause устранён на уровне сборки; если возможно в рамках task, подтверждён запуск через `tauri dev`/desktop smoke.

## Верификация
- Targeted RED check на наличие Node built-ins в browser bundle или на импорт browser-safe helper.
- GREEN: targeted tests/build.
- Post-fix grep по `packages/desktop/dist/assets/*.js`.

## Ожидаемый handoff
```
## Result
- **status**: success | partial | failed
- **summary**: что именно было сделано
- **files_changed**: список изменённых/созданных файлов
- **tests**: какие проверки запускались и результат
- **blockers**: что осталось или мешает
- **next_steps**: что делать дальше
```

## Лог попыток
- Attempt 1: backend subagent вернул пустой handoff без `status`; по контракту попытка считается failed. План Retry 1: сузить scope до минимального fix-path — убрать runtime imports `@openkanban/core` из desktop компонентов и подтвердить через rebuild + grep browser bundle.
- Attempt 2: backend subagent снова вернул пустой handoff без `status`; по контракту попытка считается failed. План Retry 3 (MAX): сменить роль на `frontend`, так как проблема находится в browser/runtime boundary desktop UI.
- Attempt 3: frontend subagent также вернул пустой handoff без `status`; по контракту попытка считается failed. Достигнут MAX retry, ветка помечена blocked до решения проблемы с subagent execution / handoff.

## Статус
- BLOCKED: root cause продукта уже локализован, но bounded fix не выполнен, потому что 3 подагентные попытки подряд не вернули валидный handoff и не дали проверяемого результата.
