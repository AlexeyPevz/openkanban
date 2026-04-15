# PRD — OpenKanban for OpenCode MVP

> **Status note:** исходная идея native host UI уточнена. Текущий целевой продукт — OpenCode plugin + отдельный Tauri companion app, запускаемый из OpenCode и синхронизированный с file-first task sources.

## 1. Product Scope

### In scope

- OpenCode plugin installation and companion app launch flow;
- companion desktop app as primary visual kanban surface;
- default binding to the currently active OpenCode project;
- manual in-app switching between known OpenCode projects with full edit capability;
- auto-discovery task sources;
- нормализация board и task data в единый internal model;
- file watching и live refresh;
- kanban columns и task cards;
- drag-and-drop / keyboard-driven статусные переходы;
- preflight при переходе в `active`;
- blocker explanation;
- agent/resource assignment metadata;
- required agents / required skills / gates metadata;
- orchestration bridge для реакций на status changes;
- host/project config для theme, fonts, hotkeys и registry hints.

### Out of scope

- внешние SaaS integrations;
- единый aggregated global board по всем проектам одновременно;
- historical analytics;
- collaborative real-time multi-user editing;
- remote execution transport.

## 2. Data Sources

Порядок discovery в MVP:

1. `.tasks/board.yml`
2. `.tasks/tasks.yml`
3. `.kanban/board.json`
4. `tasks/**/*.md`
5. `issues/**/*.md`

Дополнительные contextual inputs:

- `AGENTS.md`
- `RULES.md`
- `README.md`
- host/project config для theme, fonts, hotkeys и registry hints
- список известных проектов OpenCode и текущий active project context

Если найдено несколько источников:

- plugin/core выбирает primary source по приоритету и валидности;
- UI показывает, что выбрано;
- пользователь может переопределить источник позже.

### Source selection rules

1. Выбирается источник с наивысшим поддерживаемым приоритетом.
2. Если кандидатов несколько на одном уровне, выигрывает полностью валидный источник с наибольшей полнотой board metadata.
3. Если полнота одинакова, выигрывает источник с canonical format preference: `.tasks/board.yml` выше любых fallback formats.
4. Если остаётся конфликт, система входит в degraded mode: выбирает read-only primary candidate, показывает warning и предлагает ручной override.

## 3. Canonical Card Model

### Required fields в canonical model

- `id`
- `title`
- `status`
- `source_file`
- `updated_at`

### Optional fields в canonical model

- `description`
- `priority`
- `assignees`
- `required_agents`
- `required_skills`
- `progress`
- `blocked_reason`
- `artifacts`
- `resources`

### Defaulting and normalization rules

- `priority` по умолчанию = `medium`
- `description` по умолчанию = пустая строка
- `assignees`, `required_agents`, `required_skills`, `artifacts` по умолчанию = пустые массивы
- `progress` по умолчанию = `0`
- `blocked_reason` по умолчанию отсутствует, кроме статуса `blocked`
- legacy sources могут не содержать все optional fields; они вычисляются normalizer'ом

Допустимо расширение через `metadata`, но canonical fields должны быть стабильными.

## 4. Status Model

### Основные статусы MVP

- `planned`
- `active`
- `review`
- `done`
- `blocked`

### Дополнительные

- `parked`
- `cancelled`

## 5. Functional Requirements

### FR1. Discovery

Система должна автоматически сканировать project root и находить поддерживаемые task sources.

### FR1a. Current project binding

При открытии board из OpenCode companion app должен по умолчанию открывать active project OpenCode.

### FR1b. Multi-project switching

Companion app должен уметь показывать список известных OpenCode проектов и позволять вручную переключаться между ними без смены active project в OpenCode.

Ручное переключение должно оставаться полноценно редактируемым, а не read-only.

### FR2. Rendering

Система должна показывать board с колонками и карточками в стиле хоста.

### FR2a. Host launch surface

Минимум в MVP:

- plugin устанавливается в OpenCode;
- board можно открыть из OpenCode командой/tool flow;
- опционально поддерживается auto-launch companion app вместе с OpenCode, если включён соответствующий host/plugin flag.

### FR3. Sync from files

Изменения файлов должны отражаться в UI без перезапуска.

### FR4. Sync to files

Перемещение карточки или статусная команда должны менять source-of-truth в файле.

### FR4a. Create task card

Пользователь должен иметь возможность создать новую карточку из board UI или через host command.

Минимум в MVP:

- задать `title`;
- выбрать начальный `status`;
- задать `description`, `priority`, `assignees`, `required_agents`, `required_skills`;
- сохранить карточку в canonical source-of-truth.

### FR4b. Edit task card

Пользователь должен иметь возможность редактировать существующую карточку.

Минимум в MVP:

- изменить `title` и `description`;
- изменить metadata полей карточки;
- записать изменения обратно в source-of-truth с валидацией.

### FR4c. Resource assignment

Пользователь должен иметь возможность назначать и снимать resources (agents / skills / MCP / tools) так, чтобы изменения сохранялись в source-of-truth, а не только в runtime state.

### FR5. Preflight gate

Перед `planned -> active` система должна проверить обязательные поля и gate rules.

Если preflight не проходит:

- карточка не переводится в `active`;
- статус становится `blocked`;
- в `blocked_reason` записывается причина.

### FR6. Orchestration bridge

Обязательный путь MVP: изменение source-of-truth в файле.

Дополнительный capability-dependent путь: публикация runtime event, который может быть подхвачен orchestrator.

Если runtime event publishing недоступен в host surface, MVP остаётся рабочим через file-change-first orchestration.

### FR6a. Kanban execution contract

При включённом kanban mode orchestrator и одиночный агент должны следовать единому task lifecycle contract:

- запуск работы — только от карточки и её state transition;
- прогресс, блокеры и артефакты пишутся обратно в task source;
- side-channel task execution вне kanban считается исключением и должен быть явно отмечен.

### FR7. Keyboard support

MVP должен поддерживать:

- открыть/скрыть kanban;
- переход по карточкам;
- быстрое изменение статуса;
- открытие деталей карточки;
- ручной rescan.

### FR7a. Companion navigation

MVP должен поддерживать:

- открыть board из OpenCode;
- перейти к active project по умолчанию;
- вручную переключить проект внутри companion app;
- сохранить file-first workflow после переключения проекта.

### FR8. Explainability

Карточка должна показывать текущий state, involved agents и blocker explanation.

## 6. UX Requirements

- Визуальный стиль — максимально близкий к host-native
- Подача — минималистичная, преимущественно чёрно-белая
- Необходимые UI states: `loading`, `empty`, `error`, `success`
- Details view должен объяснять, что делает orchestrator по карточке
- Companion app по умолчанию открывает active project OpenCode, но даёт явный project switcher для ручного перехода к другим проектам
- Theme и fonts должны подтягиваться из host context, а fallback preset-ы допустимы только как degradable path

## 7. Card UX

Карточка в MVP содержит:

- title;
- compact status;
- progress indicator;
- assigned/recommended agents/resources;
- blocker marker;
- hover/details view.

Details view показывает:

- текущий статус;
- progress;
- required agents / skills;
- active gates;
- последнее объяснение блокера;
- source file.

## 8. Acceptance Criteria

- Plugin поднимается без ручной конфигурации, если найден хотя бы один валидный task source
- Из OpenCode можно открыть companion app для текущего проекта
- Companion app по умолчанию показывает active project OpenCode
- В companion app можно вручную переключиться на другой известный проект и полноценно редактировать его board
- Board корректно обновляется от file watcher
- Status change меняет source-of-truth в файле
- Пользователь может создать карточку и увидеть её в canonical source-of-truth
- Пользователь может отредактировать карточку и увидеть сохранённые изменения
- Назначение resources сохраняется в source-of-truth
- `planned -> active` запускает preflight
- failed preflight переводит карточку в `blocked` с объяснением
- Пользователь видит назначенных агентов и blocker explanation
- Есть command/tool path для открытия board; host hotkey — preferred, но допускается capability-dependent fallback
- Если host runtime events доступны, orchestration bridge получает событие о смене статуса
- Если host runtime events недоступны, workflow остаётся рабочим через file-change-first path
- При нескольких найденных источниках система либо выбирает один по правилам, либо честно переходит в degraded mode
