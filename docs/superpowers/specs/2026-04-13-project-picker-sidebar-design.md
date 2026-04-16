# Project Picker Sidebar Design

> Status: draft

## Goal

Определить bounded дизайн для **Task 3.2.2**: постоянная левая панель
проектов в desktop companion app, которая читает registry-backed catalog,
показывает проекты в host-like виде и позволяет сразу переключать основной
kanban по клику.

## Context

После завершения Task 3.2.1 система уже умеет:

- хранить companion-global known-projects registry в Tauri app data;
- гидратировать этот каталог в frontend store;
- синхронизировать successful current/rebind flow в catalog source.

Следующий шаг — дать пользователю UI для выбора проекта без повторного
пересмотра source model.

## User Decisions

Пользователь явно выбрал следующие рамки для 3.2.2:

1. UI shape — **постоянно видимая узкая левая панель** рядом с board.
2. Клик по проекту **сразу переключает** основной kanban на этот проект.
3. Отдельная кнопка `Switch` **не нужна**.
4. По умолчанию показываются доступные проекты, но есть toggle
   **`Show unavailable`**.
5. Клик по unavailable project открывает специальное состояние
   **`project unavailable`** вместо board.
6. В строке проекта нужна **иконка как в OpenCode**.
7. Реальная host/OpenCode project icon обязательна как primary path;
   если host API недоступен, допустим **временный fallback**.
8. Нужен action **`Open/Add project...`**:
   - открыть folder picker;
   - валидировать проект;
   - добавить в registry;
   - сразу переключить на него.
9. Поиск по проектам в 3.2.2 не нужен.
10. Сортировка должна быть **как в OpenCode**, а если это недостижимо в рамках
    task, fallback:
    - active project first;
    - затем recent по `lastOpenedAt`.

## Recommended Approach

Для 3.2.2 выбирается вариант **A — thin host-like sidebar**:

- sidebar строится поверх уже существующего registry-backed catalog;
- UI ведёт себя максимально близко к OpenCode;
- клик по строке = immediate switch attempt;
- host-like icon тянется через отдельную desktop/host bridge boundary;
- если host icon недоступна, используется временный fallback, но контракт
  строится вокруг host metadata как primary path.

Этот вариант намеренно приоритизирует UX parity с OpenCode над более глубоким
внутренним abstraction-first подходом, но всё ещё требует явных архитектурных
границ, чтобы не смешать catalog source, host metadata и switch orchestration.

## Scope

### In scope for 3.2.2

- постоянная левая панель проектов;
- список проектов из registry-backed catalog;
- active project marker;
- toggle `Show unavailable`;
- click-to-switch для available project;
- `project unavailable` state для unavailable project;
- `Open/Add project...` flow с folder picker, validation, registry upsert и
  immediate switch;
- host-like project icon contract;
- host-like sorting contract с fallback;
- тесты для store, bridge, UI wiring и switch flow.

### Out of scope for 3.2.2

- search/filter input;
- heavy discovery scan;
- multi-project simultaneous runtime;
- rich project settings/editor;
- advanced metadata editing;
- complex preview/diff UI before switch.

## Architecture Boundaries

### 1. Catalog source/store

Уже существующий слой из 3.2.1 остаётся source of truth для known projects.

Responsibilities:

- hydrate project list from desktop registry;
- upsert opened project after successful init/rebind/add flow.

### 2. Picker model/store

Новый слой поверх catalog source отвечает за sidebar-ready state:

- visible project list;
- active project marker;
- unavailable visibility toggle;
- sorting;
- unavailable state selection;
- add/open flow state;
- switch orchestration state.

Этот слой не должен сам лазить в Tauri dialog API или напрямую вычислять
host icon. Он должен работать через bridge/dependency boundary.

### 3. Desktop / host bridge

Отдельный adapter boundary нужен для host-specific и desktop-specific операций:

- folder picker;
- project validation orchestration;
- host icon fetch;
- optional host sorting metadata if available.

UI не должен напрямую знать, как именно добываются эти данные.

### 4. Sidebar UI

Компонентный слой рендерит:

- header `Projects`;
- action `Open/Add project...`;
- toggle `Show unavailable`;
- список проектов;
- active/unavailable indicators.

Sidebar должен быть потребителем нормализованного picker state, а не местом,
где реализована основная бизнес-логика.

## UX and States

## Sidebar layout

Слева появляется постоянная узкая колонка. Сверху вниз:

1. header панели;
2. action `Open/Add project...`;
3. toggle `Show unavailable`;
4. project list.

## Project row content

Каждая строка проекта содержит:

- host-like leading icon;
- название проекта;
- минимальный статусный индикатор:
  - active
  - unavailable

## Row behavior

### Active project

- визуально помечен как текущий контекст;
- основной board уже показывает его kanban.

### Available project

- клик сразу инициирует switch attempt;
- после success active marker переносится на новый проект;
- основной board показывает задачи нового проекта.

### Unavailable project

- строка видима только если включён `Show unavailable`;
- клик открывает состояние `project unavailable` вместо board.

## Main area states

Правая часть UI может быть в одном из состояний:

1. **active project board** — нормальный kanban выбранного проекта;
2. **project unavailable** — если пользователь кликнул unavailable project;
3. **switching** — краткое transitional state при switch;
4. **add/open validation error** — если выбранная через picker папка невалидна.

Для 3.2.2 не вводится отдельный `selected but not active` state.

## Data Flow

### Click on available project

1. sidebar dispatch'ит open/switch intent;
2. picker model проверяет record;
3. если `isAvailable: true`, запускается controlled switch flow;
4. после success:
   - active project updates;
   - board reloads for new project root;
   - catalog metadata stays in sync.

### Click on unavailable project

1. sidebar dispatch'ит open intent;
2. picker model видит `isAvailable: false`;
3. board заменяется на `project unavailable` state;
4. текущий runtime не должен silently corrupt active board state.

### `Open/Add project...`

1. UI вызывает folder picker через desktop bridge;
2. cancel => no-op;
3. selected directory => validation;
4. valid project => registry upsert + immediate switch;
5. invalid project => validation error state, current active project remains.

## Host Icon Contract

Primary path для иконки — host/OpenCode metadata.

Логический adapter contract должен уметь вернуть хотя бы:

- project label;
- host icon;
- optional sorting hint.

Если host icon недоступна в текущем task из-за отсутствия API/данных, допустим
временный fallback. Но этот fallback должен быть явно помечен как temporary,
а архитектура должна строиться вокруг host metadata path, а не вокруг fallback.

## Sorting Contract

Primary sorting goal — host-like ordering.

If exact host ordering is not available in 3.2.2, fallback is:

1. active project first;
2. then descending `lastOpenedAt`.

## Error Handling

| Scenario | Behavior |
| --- | --- |
| host icon available | render host icon |
| host icon unavailable | render temporary fallback and keep flow working |
| project unavailable clicked | show `project unavailable` state |
| switch fails | keep previous active project and show switch error |
| folder picker cancelled | no-op |
| folder selected but invalid | show validation error, do not switch |

## Testing Strategy

### 1. Store/model tests

- sorting behavior;
- active marker;
- unavailable visibility toggle;
- unavailable click => unavailable state;
- available click => switch orchestration call;
- add/open flow state transitions.

### 2. Desktop bridge tests

- folder picker cancel;
- invalid folder rejection;
- valid folder => registry upsert + switch trigger;
- host icon success;
- host icon fallback path.

### 3. Switch tests

- click on available project switches board context;
- click on unavailable project does not corrupt previous active context;
- failed switch keeps previous active project.

### 4. Component tests

- sidebar renders project rows;
- active row styling;
- unavailable rows hidden/shown by toggle;
- `Open/Add project...` action visible and wired.

## Acceptance Criteria

Task 3.2.2 считается выполненным, когда:

1. есть постоянная левая панель проектов;
2. она читает registry-backed catalog;
3. она показывает host-like icon;
4. available project click immediately switches kanban;
5. unavailable project click opens `project unavailable` state;
6. есть `Show unavailable` toggle;
7. есть `Open/Add project...` action;
8. add/open flow validates, upserts and immediately switches;
9. sorting follows host-like strategy or declared fallback;
10. search, heavy scan и multi-project runtime не добавлены.

## Implementation Slicing Recommendation

Чтобы 3.2.2 не стал oversized task, рекомендована декомпозиция:

- **3.2.2.1** picker domain/store
- **3.2.2.2** desktop bridge (folder picker + host icon contract)
- **3.2.2.3** sidebar UI
- **3.2.2.4** click-to-switch integration and unavailable state

## Risks

### Main risk

Смешать в одном месте:

- catalog source;
- host metadata;
- switch orchestration;
- sidebar rendering.

Это быстро приведёт к спутанному UI/store слою и усложнит следующие tasks.

### Secondary risk

Если не отделить host icon contract от fallback path, временный fallback может
случайно стать постоянным implementation path.

## Success Definition

3.2.2 спроектирован корректно, если:

1. task можно реализовывать bounded-срезами;
2. immediate-switch UX зафиксирован явно;
3. unavailable-state contract определён;
4. add/open flow определён end-to-end;
5. host icon requirement зафиксирован вместе с temporary fallback policy.
