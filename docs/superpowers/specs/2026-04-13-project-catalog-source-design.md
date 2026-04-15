# Project Catalog Source Design

> Status: draft-approved by user in chat, pending spec review

## Goal

Определить и зафиксировать источник списка известных OpenCode проектов для
companion app, чтобы последующие tasks могли построить project picker и manual
switching поверх предсказуемого каталога.

## Problem

После завершения Slice 3.1 companion app уже умеет:

- открываться на active OpenCode project;
- принимать repeat launch с новым `--directory`;
- выполнять runtime rebind без перезапуска sidecar.

Но система всё ещё не знает, откуда брать **список известных проектов** для
manual switching. Без этого нельзя построить:

- project picker;
- recent/known projects UX;
- controlled switching на проект, который не является текущим host project.

## User Decisions

Пользователь явно выбрал следующие рамки:

1. Источник списка проектов — **hybrid**:
   - registry известных проектов;
   - плюс discovery-путь для добавления новых записей.
2. Registry хранится как **общий companion-level файл**, а не внутри каждого
   project-local source-of-truth.
3. Запись проекта должна содержать не только путь, но и метаданные:
   - `projectPath`
   - `name`
   - `lastOpenedAt`
   - `source`
   - `isAvailable`
4. Registry пополняется двумя путями:
   - project реально открыт через plugin/desktop;
   - discovery находит новый кандидат и добавляет его как `discovered`.

## Recommended Approach

### Hybrid registry + discovery

Primary source of truth для project catalog — **global companion registry file**.

Discovery не заменяет registry, а только:

- добавляет новые записи;
- обновляет availability;
- не ломает накопленную known-projects историю.

Это даёт баланс между предсказуемостью и usability:

- registry хранит стабильный каталог известных проектов;
- discovery даёт путь расширить этот каталог без ручного ввода.

## Registry model

### Physical storage

Registry lives in the **Tauri app data directory** for companion app.

This means:

- registry is companion-global, not project-local;
- registry path is resolved by desktop runtime through Tauri app-data mechanism;
- project catalog is not stored inside `.tasks` of any single project.

### File format and empty state

Registry file format is:

```json
{
  "projects": []
}
```

Rules:

- if registry file does not exist, system treats it as empty registry;
- first successful write creates the file;
- registry consumers work against the logical `projects[]` list, not raw file layout.

### Record shape

```json
{
  "projectPath": "/abs/path/to/project",
  "name": "Project Name",
  "lastOpenedAt": "2026-04-13T21:00:00.000Z",
  "source": "opened",
  "isAvailable": true
}
```

### Field semantics

- `projectPath` — уникальный ключ записи.
- `name` — человекочитаемое имя для UI.
- `lastOpenedAt` — обновляется только при реальном open/rebind.
- `source`:
  - `opened`
  - `discovered`
- `isAvailable` — валиден ли проект сейчас.

## Merge rules

### 1. Unique key

`projectPath` — единственный identity key.

### 2. Source precedence

`opened` сильнее `discovered`.

Если проект был реально открыт, запись нельзя понижать обратно до
`discovered`.

### 3. `lastOpenedAt`

Обновляется только при реальном open/rebind.

Discovery не должен подделывать recentness.

### 4. `name`

Приоритет имени:

1. уверенно вычисленное project name из project context;
2. уже сохранённое имя в registry;
3. basename пути.

### 5. `isAvailable`

Обновляется по минимальной проверке валидности пути.

### 6. No automatic hard delete

Для 3.2.1 записи не удаляются автоматически. Если проект временно недоступен,
он остаётся в registry как `isAvailable: false`.

## Discovery model

### Scope

Discovery в 3.2.1 должен быть **bounded**, без тяжёлого или магического скана.

### In-scope discovery sources

1. проекты, реально открытые через plugin/desktop and passed through open/rebind flow.

### 3.2.1 implementation constraint

For **3.2.1 implementation only**, discovery is intentionally limited to
projects already observed via successful open/rebind flow.

Additional candidate sources may be added in later tasks, but are explicitly
out of scope for the first implementation of project catalog source.

### Out-of-scope discovery sources

- рекурсивный scan всего home directory;
- поиск “всех папок с `.tasks`” по диску;
- тяжёлая background indexing/auto-crawl логика.

## Minimal project validity

Путь считается valid OpenCode project candidate, если:

1. это существующая директория;
2. внутри есть хотя бы один ожидаемый маркер:
   - `.tasks/`
   - `opencode.json`

### Availability rule

- `isAvailable: true` — директория существует и проходит минимальную проверку;
- `isAvailable: false` — иначе.

## Architecture boundaries

### In scope for 3.2.1

- формат global project registry;
- physical location and empty-state behavior of registry file;
- merge rules for known/discovered projects;
- minimal validity rules;
- contract for later project picker source.

### Out of scope for 3.2.1

- actual project picker UI;
- manual switch UI flow;
- full edit mode after switch;
- aggressive filesystem scan;
- multi-project simultaneous runtime.

## Data flow

### Path A — project opened from OpenCode

1. plugin launches desktop with `--directory`;
2. desktop/sidecar switch to that project;
3. companion registry upserts project with:
   - `source: opened`
   - refreshed `lastOpenedAt`
   - updated `isAvailable`

### Path B — discovered candidate

1. system observes a project via successful open/rebind flow;
2. validates path against minimal project rules;
3. if absent in registry, adds record as known project;
4. if already present, updates only safe metadata (`isAvailable`, maybe `name`).

## Future integration points

This design is the basis for:

- **3.2.2** project picker reading from registry-backed catalog;
- **3.2.3** controlled rebind from selected project;
- **3.2.4** full edit mode after switch;
- **3.2.5** write-flow verification on non-active OpenCode project.

## Risks

### Main risk

Если discovery сделать слишком широким уже в 3.2.1, система станет
непредсказуемой и тяжёлой. Поэтому scan intentionally bounded.

### Secondary risk

Если registry будет хранить слишком мало данных, picker и recent-project UX
придётся переделывать. Поэтому поля `name`, `lastOpenedAt`, `source`,
`isAvailable` включаются сразу.

## Success criteria

Task 3.2.1 считается завершённым, когда:

1. есть зафиксированный registry format для known projects;
2. есть явные merge rules between `opened` and `discovered` entries;
3. есть bounded discovery contract;
4. есть минимальные project validity rules;
5. следующий task (3.2.2) может строить picker без повторного пересмотра source model.
