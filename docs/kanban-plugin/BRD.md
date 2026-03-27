# BRD — Kanban Plugin for Agentic IDEs

## 1. Проблема

В agentic IDE удобно наблюдать ход сессии, но неудобно:

- быстро менять приоритет задач;
- переназначать агентов;
- видеть блокеры как часть workflow;
- запускать orchestration не через хаотичный чат, а через операционные действия над карточкой.

Для текущего harness это критично: слой координации задач уже нужен, а управляемый kanban-интерфейс поверх файлов и агентов ещё отсутствует.

## 2. Видение продукта

`Kanban Plugin for Agentic IDEs` — это встроенный файловый kanban, который:

- автоматически находит task sources в проекте;
- визуализирует задачи в стиле хоста;
- синхронизируется с файловым source of truth;
- превращает drag-and-drop и статусные действия в реальные orchestration events.

Первая платформа — `OpenCode Desktop`. Архитектура изначально строится так, чтобы позже добавить adapters для других agentic IDE/ADE/CLI.

## 3. Целевая аудитория

### Основная

- разработчик, который управляет несколькими агентами в OpenCode;
- автор harness / orchestrator workflow;
- power user, которому нужен git-friendly operational board внутри среды.

### Вторичная

- команды, использующие file-based task systems;
- open-source maintainers, которым важна прозрачность без закрытой БД.

## 4. Ценность MVP

MVP должен дать пользователю четыре ключевые выгоды:

1. **Прозрачность** — задачи живут в файлах проекта, а не в скрытом state.
2. **Операционность** — движение карточки меняет реальный workflow.
3. **Управляемость** — карточки можно не только перемещать, но и создавать/редактировать прямо в рабочем потоке.
4. **Нативность** — kanban ощущается частью хоста, а не отдельным приложением.
5. **Расширяемость** — core не завязан на один IDE host.

## 5. Цели MVP

- Запуск kanban без ручной конфигурации, если найден поддерживаемый task source
- Отображение колонок и карточек с live-обновлением от файлов
- Изменение source of truth при drag-and-drop или статусных командах
- Создание и изменение карточек в canonical source of truth
- Preflight-проверка перед переводом в `active`
- Передача orchestration signal через file change и/или host event bridge
- Поддержка назначений агентов, required skills, priority и blocker explanation

## 6. Не-цели MVP

- Полный аналог Jira/Linear
- Продвинутая аналитика, burndown, velocity, dashboards
- Мультиворкспейсный режим
- Полноценный SSH/SFTP-backed board
- Богатая визуальная кастомизация
- Глубокая history/audit analytics внутри UI

## 7. Условия успеха

MVP считается успешным, если пользователь может:

- открыть board внутри OpenCode;
- увидеть найденные задачи без ручной настройки;
- перевести карточку между статусами и увидеть реальное изменение в файлах;
- понять, почему задача заблокирована или не прошла preflight;
- инициировать orchestration через операционное действие на карточке.

## 8. Бизнесовые и технические риски

### R1. Неподтверждённый UI extension surface OpenCode

Проверенный plugin package показывает hooks/tools, но не даёт подтверждённого публичного API для нативного overlay.

**Решение:** заложить validation gate и fallback на command-opened panel/webview bridge.

### R1a. Неподтверждённость не только overlay, но и части host surfaces

Помимо overlay/panel, отдельно должны быть подтверждены:

- command registration;
- hotkeys integration;
- theme/font lookup;
- runtime event publishing.

**Решение:** capability matrix как отдельный ранний slice с явными exit criteria.

### R2. Гетерогенные форматы task sources

Проекты могут хранить задачи по-разному.

**Решение:** hybrid discovery + canonical internal model + recommended format `.tasks/board.yml` + `.tasks/tasks/*.md`.

### R3. Оркестрация не должна зависеть только от UI

Если UI временно недоступен, task state всё равно должен работать.

**Решение:** file-first architecture, где orchestration запускается от source-of-truth, а UI — лишь operational surface.
