# Task 007 — Диагностика desktop RPC timeout

## Milestone
- M2 Desktop runtime recovery

## Slice
- Локализовать и устранить `RPC timeout: timed out waiting on channel` после исправления black screen

## Цель
- Найти root cause разрыва в цепочке `frontend -> Tauri invoke -> Rust bridge -> sidecar JSON-RPC -> response` и исправить его минимальным проверяемым изменением.

## Входные файлы
- `AGENTS.md`
- `.tasks/done/task-006-browser-safe-core-boundary.md`
- `packages/desktop/src/lib/rpc.ts`
- `packages/desktop/src-tauri/src/main.rs`
- `packages/desktop/src-tauri/tauri.conf.json`
- `packages/sidecar/src/index.ts`
- `packages/sidecar/src/server.ts`
- `packages/sidecar/src/methods/board.ts`

## Подтвержденные факты
- Desktop окно больше не черное: UI рендерится и показывает error screen.
- Пользователь видит `RPC timeout: timed out waiting on channel`.
- `rpc.ts` вызывает `invoke('rpc_call', { method, params })`.
- Rust `rpc_call` пишет request в sidecar stdin и ждет response через `recv_timeout(10s)`.
- Timeout означает: либо sidecar не стартует корректно, либо request не доходит, либо response не возвращается/не парсится мостом.

## Гипотезы для проверки
- Sidecar стартует, но падает до ответа.
- Sidecar жив, но `board.load` зависает или ломается на projectDir/cwd.
- Rust bridge читает stdout, но пропускает/теряет response.
- Sidecar пишет важные ошибки в stderr, а Rust их сейчас не читает.

## Критерии готовности
- Есть воспроизводимое доказательство места поломки.
- Если будет фикс, desktop больше не показывает RPC timeout на стартовой загрузке.
- Есть целевая верификация: standalone sidecar check и desktop runtime check.

## Верификация
- Standalone JSON-RPC вызов `board.load` к sidecar.
- Логи/проверки Rust ↔ sidecar stdout/stderr.
- Повторный запуск desktop binary после фикса.
