# Task 001 — Kanban Plugin doc pack

## Цель
Подготовить согласованный пакет документов для запуска разработки `Kanban Plugin for Agentic IDEs`, начиная с OpenCode Desktop.

## Входные данные
- Пользовательское описание продукта и MVP
- `AGENTS.md`
- глобальные orchestrator skills

## Уже зафиксировано
- Базовый design approach: host-native operational kanban with file-first core
- Первый host: OpenCode Desktop
- Архитектура должна расширяться на другие agentic IDE/ADE/CLI через adapters
- MVP source of truth: файлы
- Host/runtime bridge обязателен
- В MVP входят операционные действия: drag-and-drop, назначение агентов, required skills, priority, gates с параметрами, создание и изменение карточек
- Поддержка агентов: основной путь через plugin commands/API, file fallback обязателен
- Перевод в `active` запускает preflight; при невалидности карточка автоматически уходит в `blocked` с объяснением причины
- Scope MVP: один project root, без глобального multi-workspace режима
- Нужен отдельный skill/contract, который обязывает orchestrator и одиночного агента работать через kanban
- Рекомендуемый путь по форматам: hybrid discovery + recommended canonical format + частичная запись/миграция для чужих форматов
- Gate system MVP: hybrid — preset gates + custom rules, зависящие от типа задачи (например UI/E2E, backend coverage, docs, review)
- Recommended canonical format MVP: `.tasks/board.yml` + `.tasks/tasks/*.md`
- OpenCode UX direction MVP: иконка в host chrome + hotkey + выезжающая сверху resizable шторка/overlay с возможностью расширения почти до full-screen
- Agent registry MVP: local project agents + host-level registry + ad hoc manually added agents
- Doc pack создан в `docs/kanban-plugin/` и design summary создан в `docs/superpowers/specs/2026-03-26-kanban-plugin-design.md`
- В docs зафиксированы create/edit scope карточек, capability matrix OpenCode surfaces, agent registry sync policy, file-first orchestration event contract и kanban execution contract
- OpenCode host UI/API неопределенности переведены из open questions в explicit validation/fallback slice, а не оставлены скрытыми допущениями

## Восстановленные артефакты сессии
- `.tasks/recovered/session-recovery-kanban-2026-03-23.md` — восстановленный product/spec prompt, intent prompt и prompt подтверждения плана из локальных артефактов OpenCode

## Открытые вопросы
- Реальная capability matrix OpenCode plugin surfaces должна быть подтверждена в первом implementation slice
- Итоговый host surface для board зависит от результата capability validation

## Критерии готовности
- Согласованы product/docs decisions
- Подготовлены BRD, PRD, user stories, technical design, MVP task list
- Подготовлен kanban execution contract
- Документы пригодны как вход для планирования и начала разработки

## Верификация
- Пользователь подтвердил ключевые design decisions
- Документы сохраняются в репозитории и образуют связный стартовый пакет
- Internal review doc pack дал вердикт APPROVED после исправлений

## Результат
- Doc pack утвержден пользователем
- Переход к implementation planning разрешён

## Next step
- Создать детальный implementation plan и перейти к автономной разработке
