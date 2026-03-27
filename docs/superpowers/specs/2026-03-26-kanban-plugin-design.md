# OpenCode Kanban Plugin Design

> Этот файл — канонический design summary для старта planning phase. Детализирующие документы лежат в `docs/kanban-plugin/`.

## Goal

Сделать `Kanban Plugin for Agentic IDEs`, который в MVP встраивается в `OpenCode Desktop`, работает от file-based source of truth, управляет lifecycle задач через kanban-операции и передаёт изменения в orchestrator workflow.

## Approved baseline

Утверждённые решения:

- первый host — `OpenCode Desktop`;
- architecture direction — host-native operational kanban with file-first core;
- recommended canonical format — `.tasks/board.yml` + `.tasks/tasks/*.md`;
- карточка — это operational trigger, а не декоративный UI-элемент;
- `planned -> active` всегда идёт через preflight;
- при failed preflight карточка автоматически уходит в `blocked` с причиной;
- agent/skill/gate metadata входит в MVP;
- поддерживаются local agents, host registry и ad hoc agents;
- архитектура должна быть переносимой на другие host environments через adapters.

## Verified implementation constraint

В локально установленном `@opencode-ai/plugin@1.3.0` подтверждены plugin hooks, tool definitions и shell surface, но не подтверждён явный публичный API для host-native overlay injection.

Поэтому design фиксирует не скрытое допущение, а явный gate:

- **целевой UX:** host-native overlay/panel;
- **обязательный ранний slice:** проверить реальные UI extension capabilities OpenCode;
- **fallback:** command-driven panel/webview bridge без изменения domain/core architecture.

## Architecture summary

Система делится на:

- core domain;
- discovery service;
- repository adapters;
- watcher layer;
- orchestrator bridge;
- host adapter;
- UI renderer.

Domain и repository contracts проектируются schema-first. Host-specific логика ограничивается adapter/bridge слоем.

## Source of truth

- canonical board: `.tasks/board.yml`
- canonical tasks: `.tasks/tasks/*.md`
- external formats поддерживаются через adapters и normalizer

## Delivery shape

Implementation идёт по волнам:

1. file-first core;
2. host capability validation + OpenCode adapter;
3. board UI and interactions;
4. end-to-end orchestration hardening.

## Linked docs

- `docs/kanban-plugin/BRD.md`
- `docs/kanban-plugin/PRD.md`
- `docs/kanban-plugin/USER_STORIES.md`
- `docs/kanban-plugin/TECHNICAL_DESIGN.md`
- `docs/kanban-plugin/KANBAN_EXECUTION_CONTRACT.md`
- `docs/kanban-plugin/MVP_TASK_LIST.md`

## Approval gate

Для перехода к implementation plan пользователь должен утвердить doc pack с пониманием, что в нём зафиксированы:

- create/edit scope карточек в MVP;
- capability matrix для OpenCode surfaces;
- agent registry sync policy;
- file-first orchestration event contract;
- kanban execution contract для orchestrator и single-agent mode.

После утверждения этого design summary и doc pack можно переходить к детальному implementation plan и затем к автономной разработке.
