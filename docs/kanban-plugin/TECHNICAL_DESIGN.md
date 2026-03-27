# Technical Design — Kanban Plugin for Agentic IDEs MVP

## 1. Verified repo facts

По состоянию репозитория на момент подготовки design:

- проект пока не содержит production source code;
- в `.opencode/package.json` подключён `@opencode-ai/plugin@1.3.0`;
- в проверенном `@opencode-ai/plugin` подтверждены plugin hooks, tool definitions и shell access;
- в проверенном package не найдено явного публичного API для отдельной host UI injection surface.

Следствие: core и contracts можно проектировать уверенно, а host capability surface нужно валидировать ранним spike/task.

## 2. Architectural stance

### Рекомендуемый подход

`file-first host-adapted kanban`

Система делится на независимые bounded components:

1. **Core domain** — canonical task model, status rules, preflight, normalization
2. **Discovery service** — поиск и выбор source-of-truth
3. **Repository adapters** — чтение/запись конкретных форматов
4. **Watcher layer** — реакция на file changes
5. **Orchestrator bridge** — публикация task lifecycle events
6. **Host adapter** — commands, hotkeys, theme, fonts, runtime glue
7. **UI renderer** — board, columns, cards, details, errors, empty/loading states

Такая схема сохраняет переносимость: OpenCode-specific часть живёт в adapter/bridge, а не в domain/core.

## 3. Recommended canonical task format

### Board file

` .tasks/board.yml ` — каноническое описание board columns, source selection, agent registry references, default gates.

### Task files

` .tasks/tasks/*.md ` — human-readable task records с YAML frontmatter или другой структурированной шапкой.

Почему так:

- git-friendly diff;
- удобно читать человеку и агенту;
- можно сохранять rich context прямо рядом с task;
- легко мигрировать из других форматов через adapters.

## 4. Data flow

### Read path

1. Discovery service сканирует project root
2. Source selector выбирает primary source
3. Repository adapter парсит данные
4. Normalizer строит canonical board model
5. UI renderer отображает model

### Write path

1. Пользователь выполняет drag-and-drop или command action
2. Status transition service валидирует переход
3. Preflight engine проверяет gates для `-> active`
4. Repository adapter пишет обновление в source-of-truth
5. Orchestrator bridge публикует event
6. Watcher/UI получают подтверждающее обновление

## 5. Transition and gate model

### Базовые переходы

- `planned -> active`
- `active -> review`
- `active -> blocked`
- `blocked -> active`
- `review -> done`
- `planned -> cancelled`
- `planned -> parked`

### Правило preflight

Только переход в `active` обязан проходить preflight.

Проверки MVP:

- есть `title`
- есть source file
- нет fatal parse/validation error
- выполнены required field checks
- выполнены preset/custom gates, если они заданы

Если preflight падает:

- запись в `blocked_reason`
- transition result = `blocked`
- orchestration start не выполняется

## 6. Boundary contracts

### Domain boundary

Domain не знает ничего о конкретном UI, хосте или файловом формате.

### Repository boundary

Каждый adapter реализует единый контракт:

- `discover()`
- `loadBoard()`
- `loadTasks()`
- `writeTaskStatus()`
- `writeTaskMetadata()`

Все входы и выходы валидируются schema-first.

### Host boundary

Host adapter предоставляет:

- command registration
- hotkey integration
- theme/font lookup
- optional panel/overlay mounting
- event publishing into host runtime

## 7. OpenCode host strategy

### Целевой UX

Иконка в host chrome + hotkey + верхняя выезжающая resizable overlay/panel.

### Реально подтверждённое сегодня

Через проверенный plugin package подтверждён только hook/tool/shell surface.

### Capability matrix для OpenCode

Ранний validation slice обязан проверить пять capability classes:

1. panel/overlay mounting
2. command registration
3. hotkeys integration
4. theme/font lookup
5. runtime event publishing

Для каждой capability фиксируются:

- status: `verified` / `unverified` / `unsupported`
- способ интеграции
- ограничения
- fallback path

Exit criteria slice:

- подтверждён хотя бы один реальный UI surface для board;
- подтверждён хотя бы один способ открыть board командой;
- подтверждён путь keyboard interaction или documented fallback;
- подтверждён или отклонён runtime event path.

### Поэтому MVP strategy

1. **Validation slice:** подтвердить, существует ли поддерживаемый путь для host-native panel/overlay.
2. **Если путь подтверждён:** делаем host-native panel как основной UI surface.
3. **Если путь не подтверждён:** оставляем тот же core, а UI открываем через command-driven panel/webview bridge или ближайший поддерживаемый host surface.

Если окажется, что недоступны и overlay/panel, и webview-подобная поверхность, MVP всё равно может выйти как command-first operational plugin с file-first core и минимальным details surface до появления richer host API.

Это не меняет продуктовую цель, но убирает риск строить design на несуществующем API.

## 8. Agent and skill model

MVP поддерживает три источника агентских сущностей:

- local project agents;
- host-level registry;
- ad hoc manually added agents.

Карточка может содержать:

- `assignees`
- `required_agents`
- `required_skills`

Эти поля участвуют в:

- preflight checks;
- explainability UI;
- orchestration routing.

### Agent registry sync policy

Приоритет источников registry в MVP:

1. local project agents
2. host-level registry
3. ad hoc agents

Правила:

- local project agents имеют приоритет при совпадении `id`
- host-level registry используется как fallback/source enrichment
- ad hoc agent создаётся явно пользователем и сохраняется в project-local source рядом с board metadata
- ad hoc agent не переписывает local agent, а живёт как отдельная запись
- при конфликте отображается warning и требуется user resolution

## 9. UI states

Обязательные состояния UI:

- `loading` — идёт discovery/load/watcher sync
- `empty` — task source не найден или board пуст
- `error` — parse/adapter/host/UI error
- `success` — board loaded

Карточка дополнительно имеет micro-states:

- normal
- blocked
- pending-preflight
- syncing
- stale/conflicted

## 10. Error handling

- Ошибка в одном task file не должна ломать весь board
- Parse errors должны отображаться как contextual diagnostics
- Конфликт записи должен быть виден как recoverable error
- Host integration failure не должен ломать file-based core

## 10a. Orchestration event contract

### Event schema

Минимальный payload runtime event:

- `event_id`
- `correlation_id`
- `task_id`
- `from_status`
- `to_status`
- `timestamp`
- `source_file`
- `initiator` (`user` | `agent` | `system`)
- `preflight_result` (`passed` | `failed` | `skipped`)

### Delivery semantics

- file write — обязательная часть MVP и source of truth;
- runtime event — best-effort дополнительный сигнал;
- bridge обязан быть idempotent по `event_id`;
- если runtime publish не удался, file write не откатывается автоматически;
- ошибка publish логируется и отображается как recoverable warning.

### Correlation

- один status transition получает свой `correlation_id`
- все bridge side-effects используют тот же `correlation_id`

## 10b. Kanban execution contract

Orchestrator и single-agent mode должны подчиняться одному operational contract:

1. Task start разрешён только из карточки или её canonical source record.
2. `planned -> active` всегда проходит preflight.
3. Blocker обязан записываться в task source, а не только в runtime log.
4. Переход в `review` требует наличия артефактов/ссылок на результат.
5. Любой side-channel execution должен помечаться как exception и синхронизироваться обратно в kanban.

## 11. Testing strategy

### Unit

- discovery priority
- canonical normalization
- transition rules
- preflight outcomes
- repository adapter parsing/writing

### Integration

- file watcher -> UI refresh
- status change -> file write -> event publish
- multiple source candidates -> correct primary selection

### UI

- board loading/empty/error/success states
- keyboard navigation
- drag-and-drop transition handling
- blocker explanation visibility

### Acceptance

- end-to-end сценарий: discovered board -> move to active -> preflight -> write -> orchestration event

## 12. Main implementation risk register

### T1. UI surface mismatch with OpenCode plugin API

Mitigation: first implementation slice — host capability spike.

### T2. Partial writes / file corruption

Mitigation: repository layer with atomic writes where possible and validation before save.

### T3. Drift between external task formats and canonical model

Mitigation: adapter isolation + recommended canonical format + migration helpers later.
