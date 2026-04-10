# Task 012 — Live sync event contract for sidecar → Rust bridge → frontend

## Результат
- Статус: завершено
- Outcome: подтверждён текущий transport contract для live sync и зафиксирован target MVP refresh contract для следующих task-ов Slice 2.1.

## Что сделано
- Прочитаны и сопоставлены `packages/sidecar/src/watcher.ts`, `packages/sidecar/src/server.ts`, `packages/sidecar/src/notifications.ts`, `packages/desktop/src-tauri/src/main.rs`, `packages/desktop/src/lib/rpc.ts`, `packages/desktop/src/lib/stores/board.svelte.ts`.
- Подтверждено, что watcher публикует `task.changed` и `board.changed`, а Rust bridge проксирует их как `sidecar:task.changed` и `sidecar:board.changed`.
- Проверено, что во frontend сейчас нет listener-ов на эти события.
- С пользователем согласован target MVP contract: `board.changed` всегда делает полный refresh, `task.changed` делает partial refresh только для `changeType: changed`, а для `added`/`removed` вызывает полный refresh.
- Обновлён `docs/kanban-plugin/TECHNICAL_DESIGN.md` без drift относительно текущего кода.

## Подтверждённый контракт
- Sidecar stdout transport уже несёт JSON-RPC notifications:
  - `task.changed` → `{ taskId, changeType }`
  - `board.changed` → `{}`
- Rust bridge транслирует их в webview как:
  - `sidecar:task.changed`
  - `sidecar:board.changed`
- Frontend implementation отсутствует; это остаётся следующим bounded task.

## Touched files
- `.tasks/in-progress/task-012-live-sync-event-contract.md`
- `.tasks/done/task-012-live-sync-event-contract.md`
- `docs/kanban-plugin/TECHNICAL_DESIGN.md`

## Верификация
- `read packages/sidecar/src/watcher.ts`
- `read packages/sidecar/src/server.ts`
- `read packages/sidecar/src/notifications.ts`
- `read packages/desktop/src-tauri/src/main.rs`
- `read packages/desktop/src/lib/stores/board.svelte.ts`
- `grep packages/desktop for sidecar:/listen/@tauri-apps/api/event` → listeners не найдены

## Следующий task
- Task 2.1.2 — подписать desktop frontend на `sidecar:board.changed`.
