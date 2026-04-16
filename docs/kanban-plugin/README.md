# Kanban Plugin for Agentic IDEs — Doc Pack

Этот каталог — канонический пакет документов для запуска разработки `Kanban Plugin for Agentic IDEs` с первым хостом `OpenCode Desktop`.

## Статус

- Product baseline восстановлен из `.tasks/recovered/session-recovery-kanban-2026-03-23.md`
- Этот doc pack — **исторический baseline планирования**. Для актуальной информации по использованию см. [USAGE.md](USAGE.md)
- Текущая реализация покрывает plugin (6 tools), core domain, sidecar JSON-RPC и desktop companion app

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

В проверенном `@opencode-ai/plugin` (текущая зависимость: `^1.3.2`) подтверждены plugin hooks, tool definitions и shell integration, но не подтверждён публичный UI API для прямой встройки host chrome overlay. Архитектура решает это через:

1. целевой UX — host-native overlay/panel;
2. обязательный validation gate на реальную UI extension capability OpenCode;
3. fallback path — command-driven panel/webview bridge без смены core architecture.

Подробности — в `TECHNICAL_DESIGN.md`.
