# Current Project Runtime Rebind Design

> Status: draft-approved by user in chat, pending spec review

## Goal

Сделать active OpenCode project default context детерминированным и поддержать немедленное переключение уже открытого companion app на новый project root без перезапуска sidecar.

## Problem

После Task 3.1.1 launch contract уже зафиксирован: plugin передаёт `--directory`, desktop парсит аргумент и запускает sidecar с `current_dir`. Но текущая модель всё ещё опирается на стартовый `process.cwd()` sidecar как на источник project root.

Это создаёт ограничение:

- cold start работает корректно;
- повторный launch с новым `--directory` не даёт честного runtime switch внутри уже открытого app;
- frontend не может безопасно считать project context переключённым, если sidecar всё ещё смотрит в старый root.

## User-Approved Scope Decision

Пользователь явно выбрал более широкий scope для Task 3.1.2:

- новый `--directory` должен сразу переключать уже открытый app на новый проект;
- sidecar нельзя перезапускать;
- переключение должно происходить через runtime rebind.

Это осознанно расширяет исходный scope 3.1.2 и частично затрагивает то, что ранее выглядело ближе к 3.1.3 / 3.2.

## Architecture

### Core rule

`process.cwd()` перестаёт быть единственным источником project root после старта sidecar.

Вместо этого вводится runtime current project binding:

- sidecar хранит текущий активный `projectRoot` в памяти;
- repository/discovery/watcher операции берут root из runtime state;
- `process.cwd()` используется только как initial fallback для cold start;
- frontend может запросить смену active project через явный rebind protocol;
- UI считает проект переключённым только после подтверждения sidecar.

### In scope

- один active project context одновременно;
- runtime rebind без перезапуска sidecar;
- immediate switch при новом launch из OpenCode;
- пересборка watcher/repository binding после rebind.

### Out of scope

- multi-project board;
- параллельные project sessions;
- project picker UI;
- список известных проектов;
- host theme/font context.

## Components

### Plugin

Plugin остаётся почти без изменений:

- по-прежнему вызывает desktop binary с `--directory <absolute-path>`.

### Desktop Rust

Rust-слой остаётся launch surface и event bridge:

- на cold start передаёт initial project dir в runtime;
- при повторном launch доставляет новый target directory в уже живущий app как launch/rebind event;
- не принимает решение о завершении project switch без участия frontend/sidecar ack.

### Desktop Re-launch Mechanism

Для повторного запуска используется **single-instance delivery** на стороне Tauri:

- первый экземпляр desktop app остаётся владельцем runtime;
- второй запуск не создаёт независимую вторую сессию проекта;
- аргументы второго запуска передаются в первый экземпляр;
- первый экземпляр публикует новый `launch:directory` event во frontend.

Причина выбора:

- это минимальный и наиболее прямой способ доставить новый `--directory` в уже живущий app;
- не нужно проектировать отдельный custom IPC transport;
- это bounded решение именно для launch/rebind use case.

### Frontend

Frontend становится координатором project switch:

1. получает новый `launch:directory` event;
2. сравнивает target directory с текущим active project;
3. если путь изменился — вызывает sidecar `project.rebind`;
4. ждёт ack;
5. после ack сбрасывает project-bound UI state и выполняет refresh board;
6. только после этого фиксирует новый active project state.

### Sidecar

Sidecar получает новый runtime contract:

- хранит `projectRoot` в памяти;
- умеет выполнять `project.rebind`;
- пересоздаёт repository/discovery/watcher context для нового root;
- возвращает ack/error.

### Sidecar Rebind Pattern

Для sidecar выбирается **shared runtime current project ref**, а не полная пересборка dispatcher.

Форма состояния:

```ts
{ current: string }
```

Правила:

- method factories и repository access читают текущий root из shared runtime ref;
- `project.rebind` обновляет `current` только после успешной подготовки нового runtime context;
- watcher пересоздаётся для нового root;
- dispatcher остаётся стабильным и не требует полной перерегистрации методов.

Причина выбора:

- это минимально инвазивно относительно текущей архитектуры;
- снижает объём refactor по сравнению с полной пересборкой factories/dispatcher;
- делает runtime rebind явным, но не чрезмерно дорогим по сложности.

## Rebind Contract

### RPC method

`project.rebind`

### Request

```json
{
  "directory": "/abs/project/path"
}
```

### Success response

```json
{
  "directory": "/abs/project/path",
  "rebound": true
}
```

### Additional query method

`project.current`

Возвращает подтверждённый active project runtime state:

```json
{
  "directory": "/abs/project/path"
}
```

Нужен для восстановления frontend state и для явной сверки текущего root после запуска/reload.

### Error cases

- invalid path;
- root does not exist or is unreadable;
- repository/discovery bootstrap failed;
- watcher re-init failed.

### Contract rule

Frontend не считает проект переключённым, пока `project.rebind` не вернул success ack.

## Data Flow

### Scenario A — cold start

1. Plugin вызывает desktop с `--directory`.
2. Desktop стартует app и sidecar.
3. Sidecar получает initial root.
4. Frontend загружает board этого проекта.

### Scenario B — app already open

1. Из OpenCode приходит новый `--directory`.
2. Desktop доставляет новый target directory в живой app.
3. Frontend получает `launch:directory`.
4. Frontend вызывает `project.rebind`.
5. Sidecar обновляет active root и пересоздаёт watcher/repository context.
6. Sidecar возвращает ack.
7. Frontend очищает project-bound transient state.
8. Frontend выполняет refresh и показывает board нового проекта.

## State Model

### Runtime state

Нужны два связанных, но разных состояния:

1. **sidecar runtime root** — источник истины для файловых операций и watcher;
2. **frontend active project state** — подтверждённый проект, который сейчас показывает UI.

### Transition rule

Во время переключения допускается краткое состояние `switching project`, но нельзя смешивать:

- данные старого board;
- active state нового проекта без ack;
- watcher старого проекта после завершённого rebind.

## Error Handling

### Rebind failed

- active project остаётся прежним;
- frontend не коммитит новый project state;
- UI показывает честную ошибку переключения.

### Same directory

- no-op;
- можно вернуть быстрый success или вообще не вызывать rebind.

### Refresh failed after successful rebind

- active project уже считается новым;
- UI показывает ошибку загрузки board для нового проекта;
- нельзя откатывать rebind молча без отдельного rollback protocol.

## Testing Strategy

### Unit

- frontend: новый `launch:directory` → вызывает `project.rebind` только если путь изменился;
- frontend: не фиксирует active project до ack;
- frontend: корректно обрабатывает same-directory no-op и rebind failure;
- frontend: умеет восстановить active project через `project.current`;
- sidecar: `project.rebind` меняет runtime root;
- sidecar: watcher/repository context re-initializes against new root.

### Integration

- launch event в уже открытом app переводит board на новый проект;
- sidecar не перезапускается;
- после rebind write/read операции идут в новый root;
- старый project watcher не продолжает присылать события как будто он всё ещё активен.

## Risks

### Main risk

Текущая система строилась вокруг `process.cwd()` как implicit root. Перевод на runtime root потребует аккуратно найти все места, где root сейчас выводится неявно.

### Secondary risk

Task 3.1.2 становится шире исходного плана. Нужно жёстко удержать границу: один active project, явный rebind, без project catalog и без multi-project runtime.

## Success Criteria

Task считается завершённым, когда:

1. Cold start по `--directory` продолжает работать.
2. Повторный launch в уже открытый app переключает active project сразу.
3. Sidecar не перезапускается.
4. Watcher подписан на новый root и больше не работает как активный watcher старого root.
5. File read/write operations используют новый root.
6. UI не показывает ложный active project до ack.
7. Ошибка rebind не ломает текущий активный проект.

## Follow-up Implications

После этого Task 3.1.3 можно сузить до зачистки остаточной неоднозначности между launch path и fallback root behavior, а Slice 3.2 — строить уже поверх существующего runtime rebind contract.
