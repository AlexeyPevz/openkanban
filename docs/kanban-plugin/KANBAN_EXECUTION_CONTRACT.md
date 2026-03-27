# Kanban Execution Contract

## Назначение

Этот контракт задаёт обязательный operational режим, в котором `orchestrator` и `single-agent mode` работают через kanban как source of truth, а не через скрытый state или произвольные side-channel действия.

## Правила

### 1. File-first source of truth

- Каноническое состояние задачи живёт в task source.
- Runtime state не может считаться более достоверным, чем файл.

### 2. Старт работы только от карточки

- Работа по задаче начинается только после явного lifecycle transition карточки.
- Для выполнения задачи должна существовать task card или canonical task record.

### 3. Preflight обязателен для `planned -> active`

- Ни orchestrator, ни одиночный агент не могут обходить preflight silently.
- Если preflight не пройден, карточка переводится в `blocked` с записанной причиной.

### 4. Progress и blockers пишутся обратно

- Прогресс, блокеры, артефакты и ключевые handoff notes должны возвращаться в task source.
- Логи рантайма не заменяют запись в карточке.

### 5. Review gate

- Переход в `review` разрешён только если у задачи есть проверяемый результат: артефакт, ссылка, diff, commit reference или иное evidence.

### 6. Side-channel execution — только как исключение

- Если задача стартовала вне board workflow, это должно быть явно отмечено как исключение.
- Система обязана как можно раньше синхронизировать состояние обратно в task source.

### 7. Agent metadata влияет на execution

- `assignees`, `required_agents`, `required_skills` и gates считаются operational metadata.
- Orchestrator обязан учитывать их при routing и preflight.

## Acceptance criteria для контракта

- Перевод задачи в `active` без preflight невозможен
- Blocker не остаётся только в runtime log и отражается в task source
- Single-agent mode использует тот же lifecycle, что и orchestrator mode
- При file/runtime рассинхронизации приоритет получает file source of truth
- Side-channel execution детектируется и помечается как exception
