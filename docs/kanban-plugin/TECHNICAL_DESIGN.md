# Technical Design — OpenKanban Companion for OpenCode MVP

## 1. Verified repo facts

По текущему состоянию репозитория подтверждено:

- OpenCode plugin surface доступен через `@opencode-ai/plugin` hooks/tools/shell;
- native host UI injection surface не подтверждён как production-capable путь;
- companion desktop app на Tauri уже существует и запускается отдельно от host UI;
- plugin уже умеет открыть desktop binary через tool flow `kanban_open_board`;
- backend разделён на file-first core + JSON-RPC sidecar + desktop UI;
- часть MVP реализована, но есть product drift между docs и реальным кодом.

Следствие: целевой продукт — не host-native panel, а **OpenCode-aware companion app**.

## 2. Architectural stance

### Рекомендуемый подход

`file-first host-aware companion kanban`

Система делится на bounded components:

1. **Core domain** — canonical task model, status rules, preflight, normalization
2. **Discovery service** — поиск task sources и project-scoped context
3. **Repository adapters** — чтение/запись конкретных форматов
4. **Watcher layer** — реакция на file changes
5. **Orchestrator bridge** — публикация task lifecycle events
6. **OpenCode adapter** — launch contract, active project binding, project catalog, theme/font hints, command/hotkey surface
7. **Sidecar runtime** — JSON-RPC bridge между desktop UI и file-first core
8. **Companion UI** — board, project switcher, task flows, diagnostics, details, empty/error states

Ключевой принцип: OpenCode задаёт default context, а companion app выступает отдельным operational center.

## 3. Product contract

### Default flow

1. Пользователь работает в OpenCode.
2. Active project OpenCode считается default project context.
3. Команда/tool/hotkey OpenCode открывает companion app.
4. Companion app показывает board active project.

### Extended flow

Companion app может:

- показать список известных OpenCode проектов;
- вручную переключиться на другой проект;
- оставаться полноценно редактируемым и file-first даже для проекта, который не активен в OpenCode в данный момент.

## 4. Data flow

### Read path

1. OpenCode adapter определяет default active project и список известных проектов.
2. Companion app выбирает current project context.
3. Sidecar стартует/перепривязывается к project root.
4. Discovery service находит primary task source.
5. Repository adapter парсит данные.
6. Normalizer строит canonical board model.
7. UI отображает board + source diagnostics + project context.

### Write path

1. Пользователь выполняет board action (move/create/edit/assign resource).
2. Desktop UI вызывает sidecar method.
3. Domain/service слой валидирует действие.
4. Repository adapter пишет изменение в source-of-truth.
5. Sidecar публикует runtime notification.
6. Frontend подписан на notification и актуализирует board state.

### Runtime event contract for live sync

Подтверждённый текущий transport chain:

1. `FileWatcher` в sidecar следит за `projectDir/.tasks`.
2. Для task markdown changes sidecar публикует JSON-RPC notification `task.changed` с payload `{ taskId, changeType }`.
3. Для любого изменения под `.tasks/` sidecar публикует JSON-RPC notification `board.changed` с payload `{}`.
4. Rust bridge в Tauri проксирует каждую notification в webview event `sidecar:<method>`.
5. Следовательно, frontend boundary уже может слушать:
   - `sidecar:task.changed` → payload `{ taskId, changeType }`
   - `sidecar:board.changed` → payload `{}`

Target MVP refresh contract:

- `sidecar:board.changed` всегда делает полный `loadBoard()`.
- `sidecar:task.changed` обрабатывается по `changeType`:
  - `changed` → `taskApi.get(taskId)` + точечный merge в `boardState`
  - `added` / `removed` → полный `loadBoard()`
- Если partial refresh не может быть безопасно завершён, frontend делает fallback на полный `loadBoard()`.

Этот target contract документирован до реализации; по текущему коду frontend listener-ы ещё отсутствуют.

## 5. Core functional gaps identified by audit

### G1. Task payload boundary mismatch

Desktop UI уже отправляет richer task payload, но sidecar task schemas поддерживают только урезанный subset. Это нужно исправить первым.

### G2. Resource workflow incomplete

- discovery есть частично;
- persisted assign/unassign отсутствует;
- drag/drop ресурсов отсутствует;
- `tool` resources не discoverятся.

### G3. Live sync chain incomplete

Watcher + sidecar notification + Rust bridge есть, и transport contract уже подтверждён: `task.changed` → `sidecar:task.changed`, `board.changed` → `sidecar:board.changed`. Но desktop frontend пока не подписан на эти события и не реализует target refresh behavior.

### G4. OpenCode companion integration incomplete

- есть tool-triggered open board flow;
- нет завершённого current-project binding contract;
- нет project catalog / manual switcher;
- нет full-edit flow для manually selected project.

### G5. Host-native UX incomplete

- theme/font context не приходит из host;
- используются локальные preset-ы и локальные стили.

## 6. OpenCode integration model

### Confirmed today

- plugin install flow есть;
- tool-triggered board open flow есть;
- desktop binary launch с `--directory` уже заявлен на plugin layer.

### Must be completed

1. Зафиксировать launch contract между plugin и companion app.
2. Сделать current-project default binding детерминированным.
3. Добавить project catalog и manual project switching.
4. Определить lifecycle sidecar per project: respawn vs multiplexing.

### Recommended MVP approach

- один active project context в companion app одновременно;
- ручное переключение проекта = controlled rebind current context;
- sidecar можно перезапускать на новый project root при переключении, вместо раннего multi-tenant runtime.

Это проще, безопаснее и достаточно для MVP.

## 7. Theming and fonts

### MVP target

- host-derived theme/font context, если OpenCode surface это позволяет;
- fallback preset-ы остаются только degraded path, а не primary design source.

### Practical strategy

1. Plugin/host adapter поставляет runtime context (`theme`, `fontFamily`, future tokens if available).
2. Companion app применяет host tokens к CSS custom properties.
3. Если host context не подтверждён, включается явно помеченный fallback preset.

## 8. Resource model and UX

### MVP contract

Resources включают как минимум:

- `agent`
- `skill`
- `mcp`
- `tool`

### Required UX outcome

- resources discoverятся из project/host context;
- resources можно назначать и снимать с задач;
- изменение сохраняется в source-of-truth;
- UI показывает assigned/required resources без рассинхронизации с файлами.

### Scope decision

Для MVP сначала нужен **persisted form-based assignment flow**.
Drag/drop resources — desirable, но не должен блокировать завершение корректного persisted workflow.

## 9. Multi-project strategy

### In scope

- список известных OpenCode проектов;
- default current project = active project OpenCode;
- manual switch to another project in companion app;
- full edit mode after switch.

### Out of scope

- единый board с карточками всех проектов вперемешку;
- параллельный multi-project editing в одном runtime view;
- distributed sync across remote hosts.

## 10. Replan priorities

### Priority 1 — functional contract recovery

- task create/update payload alignment
- persisted resource assignment

### Priority 2 — live runtime completion

- board/task notifications → frontend refresh

### Priority 3 — companion integration

- current project binding
- manual project switching
- project catalog

### Priority 4 — host-native UX

- theme/font context
- command/hotkey/auto-launch hardening

### Priority 5 — polish

- accessibility
- keyboard refinement
- visual cleanup

## 11. Verification strategy

### Contract verification

- desktop UI payloads match sidecar schemas
- create/edit/resource actions persist into task files

### Runtime verification

- file watcher notifications refresh board in UI
- project switching rebinds board to selected project

### Integration verification

- OpenCode plugin install works
- tool-triggered open board launches companion app on active project
- manual switch to another known project remains writable

### UX verification

- host theme/font context applied when available
- fallback theme clearly works when host context absent

## 12. Main risks

### R1. Plugin-launch and desktop runtime diverge on project context

Mitigation: explicit launch contract and tests around `--directory` / active project binding.

### R2. Resource flow remains cosmetic

Mitigation: no polishing before persisted resource assignment is implemented and tested.

### R3. Doc drift returns

Mitigation: docs updated together with each replan slice and verified against code.
