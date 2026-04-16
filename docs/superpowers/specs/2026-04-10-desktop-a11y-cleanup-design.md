# Desktop Accessibility Cleanup Design

## Цель

Убрать текущие Svelte accessibility warnings в desktop UI и одновременно привести keyboard/screen-reader поведение к предсказуемому минимуму WCAG 2.1 AA без лишнего расширения scope.

## Scope

Компоненты в scope:

- `packages/desktop/src/lib/components/ShortcutsHelp.svelte`
- `packages/desktop/src/lib/components/TaskForm.svelte`
- `packages/desktop/src/lib/components/TaskDetails.svelte`
- `packages/desktop/src/lib/components/Card.svelte`
- `packages/desktop/src/lib/components/Column.svelte`

Вне scope:

- общий UI redesign
- вынос новых shared primitives в отдельный UI-kit
- большие архитектурные перестройки drag/drop
- массовый рефактор за пределами указанных warning-ов

## Подтверждённые проблемы

Ниже — точный список текущих warning-ов, который и является acceptance baseline для task-009.

| Компонент | Warning | Планируемое направление фикса |
| --- | --- | --- |
| `ShortcutsHelp.svelte` | `a11y_interactive_supports_focus` | корректный focusable dialog container |
| `ShortcutsHelp.svelte` | `a11y_click_events_have_key_events` | убрать ложную интерактивность со статического panel wrapper |
| `ShortcutsHelp.svelte` | `a11y_no_static_element_interactions` | оставить native/static semantics без лишнего click handler на panel |
| `TaskDetails.svelte` | `a11y_no_redundant_roles` | убрать redundant role с `aside` |
| `TaskDetails.svelte` | `a11y_no_noninteractive_element_interactions` | убрать key handler с non-interactive container |
| `TaskDetails.svelte` | `a11y_label_has_associated_control` (7x) | заменить `<label>` на read-only details semantics |
| `TaskDetails.svelte` | `non_reactive_update` | сделать DOM ref корректным для Svelte 5 |
| `Card.svelte` | `a11y_no_noninteractive_tabindex` | убрать tabindex с semantic container |
| `Card.svelte` | `a11y_no_noninteractive_element_interactions` | вынести selection в явный interactive control |
| `Column.svelte` | `a11y_no_redundant_roles` | убрать redundant role |

### 1. Modal semantics drift

`ShortcutsHelp.svelte` использует overlay/dialog pattern, но:

- dialog container не имеет корректной focusable semantics
- внутренние статические элементы получают click handlers, из-за чего появляются warnings

`TaskForm.svelte` не даёт такого же набора warning-ов прямо сейчас, но использует близкий modal pattern с отдельным `autofocus` и отличается по interaction-shell от `ShortcutsHelp`. Это создаёт ненужную divergence в modal UX.

### 2. Informational panel marked as interactive

`TaskDetails.svelte` использует `aside` с лишней ARIA-ролью и keyboard handler на неинтерактивном контейнере. Поля вида `Status`, `Priority`, `Source` размечены как `<label>`, хотя не связаны с form controls.

### 3. Card interaction semantics mismatch

`Card.svelte` использует `article` как keyboard/click target с `tabindex="0"`, `onclick`, `onkeydown`. Это делает неинтерактивный semantic container фактической кнопкой, что и вызывает warnings.

### 4. Column redundant semantics

`Column.svelte` навешивает redundant `role="region"` на `section`.

## Выбранный подход

Семантический cleanup по компонентным ролям.

Причины выбора:

- закрывает warnings системно, а не локальными suppress-патчами
- улучшает keyboard UX там, где это уже диктуется текущей архитектурой
- не раздувает задачу до отдельного UI foundation refactor

## Design

### A. Unified modal pattern for `ShortcutsHelp` and `TaskForm`

Оба компонента приводятся к одному паттерну:

- overlay остаётся backdrop и отвечает за визуальное затемнение и close по outside click
- настоящий dialog semantics получает внутренний panel container
- dialog container делается focusable и получает programmatic initial focus
- `Escape` остаётся supported
- focus trap сохраняется
- `autofocus` удаляется, фокус выставляется только из кода

Уточнение по мотивации:

- для `ShortcutsHelp` это прямой warning-driven fix
- для `TaskForm` это в первую очередь consistency + keyboard UX cleanup, чтобы оба modal flows следовали одному паттерну

Ожидаемый результат:

- warning-и про `dialog must have tabindex`, `click events have key events`, `noninteractive element interactions` уходят
- поведение модалок становится одинаковым

### B. Informational side panel for `TaskDetails`

`TaskDetails` трактуется как панель чтения деталей, а не псевдо-интерактивный контейнер.

Изменения:

- убрать redundant `role="complementary"`
- убрать keyboard listeners с неинтерактивного `aside`
- close оставить через явную кнопку
- статические label/value блоки заменить на pattern, подходящий для read-only details (`dl/dt/dd` или визуально эквивалентный title/value markup)
- исправить warning про `closeBtn`/reactivity через Svelte 5-compatible DOM ref pattern; базовый вариант — `let closeBtn = $state<HTMLButtonElement | undefined>()`

Ожидаемый результат:

- панель остаётся удобной для чтения и close
- screen reader semantics лучше отражают реальную структуру данных

### C. Explicit interactive control inside `Card`

`Card` не должна быть «article, который притворяется button».

Выбранный паттерн:

- semantic container карточки остаётся container (`article`)
- выбор карточки переносится на явный interactive control внутри карточки
- edit button остаётся отдельным action
- drag behavior сохраняется на container и не должен ломать keyboard selection

Причина выбора:

- не смешиваем semantic article и button behavior
- проще обеспечить честную keyboard access model
- снижаем риск конфликтов между drag handle и keyboard activation

### D. Column as structural container

`Column.svelte` остаётся structural section без redundant ARIA role.

При необходимости card list semantics сохраняются через существующую структуру list/listitem или близкий equivalent, без искусственного ARIA over-markup.

## Data / Event Flow

- `TaskForm` submit flow не меняется: create/update task → close modal
- `ShortcutsHelp` close flow не меняется: click/Escape/button → `onClose`
- `TaskDetails` close flow не меняется: close button → `selectTask(null)`
- `Card` selection flow остаётся прежним по смыслу: user activates primary control → `selectTask(task.id)`

То есть task-009 меняет semantics и interaction shell, но не меняет domain behavior stores/actions.

## Error Handling / Regression Risks

### Focus regressions

Риск: после удаления `autofocus` и смены dialog target фокус может потеряться.

Митигация:

- сохранить programmatic focus в `onMount` / mount effect
- проверить keyboard open/close path вручную

### Drag vs interactive control conflict

Риск: явный control внутри card может конфликтовать с drag behavior.

Митигация:

- не менять domain contract draggable action
- ограничить изменение только интерактивной точкой входа для selection

### Screen-reader over-markup

Риск: попытка «чинить ARIA» может сделать семантику тяжелее, чем нужно.

Митигация:

- prefer native semantics over extra ARIA
- удалять лишние roles там, где native element уже выражает смысл

## Verification Plan

Минимальная верификация для implementation stage:

1. `npm run build -w packages/desktop`
   - ожидается: исчезновение текущих Svelte a11y warnings по 5 компонентам в scope

2. targeted UI/keyboard smoke:
   - открыть `TaskForm`
   - проверить initial focus и close по `Escape`
   - открыть `ShortcutsHelp`
   - проверить close по `Escape`, button, backdrop
   - выбрать карточку с клавиатуры
   - открыть/закрыть details panel

3. при необходимости существующие desktop/UI tests обновить или дополнить

## Success Criteria

- build больше не показывает текущие a11y warnings для `ShortcutsHelp`, `TaskForm`, `TaskDetails`, `Card`, `Column`
- keyboard navigation не деградирует
- модалки и details panel ведут себя предсказуемо
- изменения остаются локальными и не выходят за пределы task-009 scope

## Non-Goals / Follow-up

Возможный follow-up после task-009:

- общий reusable modal/focus helper
- дальнейший cleanup screen-reader copy и landmarks
- review drag-and-drop accessibility beyond current warnings
- review deprecated `aria-grabbed` usage в draggable action
