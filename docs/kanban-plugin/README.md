# Kanban Plugin for Agentic IDEs — Doc Pack

Этот каталог — канонический пакет документов для запуска разработки `Kanban Plugin for Agentic IDEs` с первым хостом `OpenCode Desktop`.

## Статус

- Product baseline восстановлен и утверждён на основе `.tasks/recovered/session-recovery-kanban-2026-03-23.md`
- Этот doc pack переводит baseline в рабочие документы для планирования и кодинга
- После утверждения пользователем этот пакет становится source of truth для разработки MVP

## Состав

- `BRD.md` — бизнес-контекст и границы MVP
- `PRD.md` — продуктовые требования и acceptance criteria
- `USER_STORIES.md` — пользовательские и operational сценарии
- `TECHNICAL_DESIGN.md` — архитектура, контракты и риски реализации
- `KANBAN_EXECUTION_CONTRACT.md` — правила, по которым orchestrator и одиночный агент обязаны работать через kanban
- `MVP_TASK_LIST.md` — milestone → slice → task для старта delivery

## Канонические артефакты проекта

- Recommended source of truth для задач: `.tasks/board.yml` + `.tasks/tasks/*.md`
- Первый хост: `OpenCode Desktop`
- Архитектура должна оставаться переносимой на другие agentic IDE/CLI через adapters

## Ключевая verified оговорка

В локально проверенном `@opencode-ai/plugin@1.3.0` подтверждены plugin hooks, tool definitions и shell integration, но не подтверждён отдельный публичный UI API для прямой встройки host chrome overlay. Поэтому MVP design фиксирует:

1. целевой UX — host-native overlay/panel;
2. обязательный validation gate на реальную UI extension capability OpenCode;
3. fallback path — command-driven panel/webview bridge без смены core architecture.

Подробности — в `TECHNICAL_DESIGN.md`.
