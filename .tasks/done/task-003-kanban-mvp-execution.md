# Task 003 — Kanban Plugin MVP execution

## Цель
Автономно исполнить `docs/superpowers/plans/2026-03-26-kanban-plugin-mvp.md` до рабочего MVP результата с использованием orchestrator и subagents.

## Входные данные
- `AGENTS.md`
- `docs/superpowers/specs/2026-03-26-kanban-plugin-design.md`
- `docs/superpowers/plans/2026-03-26-kanban-plugin-mvp.md`
- `.tasks/done/task-002-kanban-implementation-plan.md`

## Уже зафиксировано
- План утверждён внутренним review и пригоден для немедленного автономного исполнения
- Recommended execution mode: subagent-driven development
- Кодинг не должен идти в `master`; нужен isolated feature workspace
- Verified environment: `node v22.19.0`, `npm 10.9.3`, `bun` отсутствует
- Проект переведён в отдельный git repo и execution branch: `task-003-kanban-mvp`
- Task 1 завершён: создан npm/TypeScript/Vitest scaffold, минимальный `src/plugin.ts`, smoke test, `.gitignore`
- Task 1 verification: `npm run test -- tests/smoke/plugin-entry.test.ts` PASS, `npm run typecheck` PASS, `npm run build` PASS
- Task 1 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 2 завершён: реализованы core types/schemas, transition rules, preflight, task event payload и kanban contract
- Task 2 verification: `npm run test -- tests/unit/core/transition.test.ts tests/unit/core/preflight.test.ts tests/unit/core/task-event.test.ts` PASS (10 tests), `npm run typecheck` PASS
- Task 2 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 3 завершён: реализованы discovery candidate scan, source override и primary source selection с degraded/manual-override semantics
- Task 3 verification: `npm run test -- tests/unit/discovery/list-source-candidates.test.ts tests/unit/discovery/select-primary-source.test.ts` PASS (11 tests), `npm run typecheck` PASS
- Task 3 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 4A1 завершён: создан RED integration harness `tests/integration/repository/canonical-repository.test.ts` и подтверждён FAIL на отсутствующей canonical repository implementation
- Task 4A2 завершён: реализованы repository contracts, `BoardYamlRepository`, `TaskMarkdownRepository`, `atomicWrite` и canonical read bootstrap
- Task 4A2 verification: `npm run test -- tests/integration/repository/canonical-repository.test.ts` PASS (3 tests), `npm run typecheck` PASS
- Task 4A2 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 4B завершён: реализованы canonical write paths `createTask`, `writeTaskStatus`, `writeTaskMetadata` и persistence для `blocked_reason`/`metadata`
- Task 4B verification: `npm run test -- tests/integration/repository/canonical-repository.test.ts` PASS (6 tests), `npm run typecheck` PASS
- Task 4B reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 5 завершён: реализованы fallback adapters (`tasks-yml`, `kanban-json`, `markdown-glob`) и normalization defaults для canonical model
- Task 5 verification: `npm run test -- tests/unit/repository/fallback-normalization.test.ts` PASS (3 tests), `npm run typecheck` PASS
- Task 5 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 6 завершён: реализованы `board-watcher`, `runtime-publisher`, `publish-task-event` с best-effort runtime publish, dedupe и stable correlation id
- Task 6 verification: `npm run test -- tests/integration/watch/board-watcher.test.ts tests/integration/bridge/publish-task-event.test.ts` PASS (4 tests), `npm run typecheck` PASS
- Task 6 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 6 root cause note: для watcher в этом окружении `chokidar` не ловит изменения через `cwd + glob`, а тесту требовалось дождаться `ready`; решение — absolute watch targets в `createBoardWatcher` и явное ожидание `ready` в integration test
- Task 6A завершён: реализованы merge/resolve agent registry rules, conflict warnings и persistence ad hoc agents в `board.yml`
- Task 6A verification: `npm run test -- tests/unit/core/agent-registry-sync.test.ts` PASS (3 tests), `npm run typecheck` PASS
- Task 6A reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 7 завершён: реализованы `probe-capabilities`, capability matrix emitter, OpenCode adapter, command/hotkey/runtime-context scaffolding
- Task 7 verification: `npm run test -- tests/unit/host/opencode/probe-capabilities.test.ts tests/unit/host/opencode/register-commands.test.ts tests/unit/host/opencode/register-hotkeys.test.ts` PASS (5 tests), `npm run typecheck` PASS, `npm run probe:opencode` PASS
- Task 7 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 7 evidence note: по текущему installed `@opencode-ai/plugin` подтверждён только export `tool`; capability matrix зафиксировала fallback path и `unsupported-by-environment` для live-host-only surfaces
- Task 8 завершён: реализованы `board-store` и renderers (`render-board`, `render-column`, `render-card`, `render-details`) для states `loading/empty/error/success`
- Task 8 verification: `npm run test -- tests/ui/render-board.test.ts` PASS (2 tests), `npm run typecheck` PASS
- Task 8 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 8A завершён: добавлены degraded diagnostics, partial-failure resilience и единый diagnostics read-path через repository layer
- Task 8A verification: `npm run test -- tests/integration/repository/partial-parse-failure.test.ts tests/ui/degraded-board.test.ts` PASS (2 tests), `npm run test -- tests/integration/repository/canonical-repository.test.ts` PASS (6 tests), `npm run typecheck` PASS
- Task 8A reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 9 завершён: реализованы drag-drop/keyboard/form/details interactions, DOM wiring helpers и contract-safe edit flow
- Task 9 verification: `npm run test -- tests/ui/task-interactions.test.ts` PASS (7 tests), `npm run typecheck` PASS
- Task 9 reviews: spec-compliance APPROVED, code-quality APPROVED
- Task 9 handoff note for Task 10: production board mount всё ещё должен реально вызвать `attachKeyboardShortcuts`, `attachTaskDropTarget`, `attachDetailsPanel`, `attachTaskFormSubmit`, иначе runtime UI останется inert несмотря на green tests
- Task 10 implementation завершена: добавлены `createPluginApp`, plugin tool wiring, DOM mount path, `tests/e2e/plugin-mvp-flow.test.ts` и `docs/kanban-plugin/USAGE.md`
- Task 10 verification: `npm run test` PASS (19 files, 56 tests), `npm run typecheck` PASS, `npm run build` PASS
- Task 10 root cause note: на Windows `rename(temp, existing)` в `atomicWrite` падал с `EPERM`; fixed via explicit `rm(filePath, { force: true })` before `rename`
- Task 10 review note: финальный subagent review pass в этой сессии дал пустые ответы reviewer tools, поэтому отдельный финальный review still desirable перед формальным закрытием execution task

## Оркестрационные решения
- Для минимизации шума в репозитории worktree создаётся в global location под `C:\Users\Alexey\.config\superpowers\worktrees\opencode-kanban\`
- Если live OpenCode host недоступен в execution environment, capability matrix фиксирует `unsupported-by-environment` и реализация идёт по command-first/file-first fallback path
- Root cause по git topology: каталог `projects/` игнорируется корневым harness-репозиторием (`.gitignore: projects/`), поэтому `OpenCode Kanban` не попадает в parent worktree и не должен развиваться через него
- Operational fix: проект переводится в отдельный git repo прямо в `D:\phantom-workspace\projects\OpenCode Kanban` и дальнейшая разработка идёт на feature branch внутри этого repo
- Execution note: если subagent упирается в step limit на крупном plan-task, оркестратор режет его на micro-slices без изменения утверждённого product scope
- Task 10 decomposition: сначала e2e RED harness, затем plugin/app runtime wiring, затем docs + full verification

## Критерии готовности
- Реализованы tasks из implementation plan с обязательными verification gates
- Все обязательные тесты, typecheck и build проходят
- Task-файлы и docs синхронизированы с фактическим состоянием

## Верификация
- После каждого task проходит focused verification
- Перед завершением проходит full verification suite

## Execution log
- Completed: Task 1 — Bootstrap package, scripts and plugin entry smoke test
- Completed: Task 2 — Canonical schemas, transitions, preflight and kanban contract
- Completed: Task 3 — Discovery, source selection and manual override
- Completed: Task 4A1 — Canonical repository RED integration test harness (`canonical-repository.test.ts`) with confirmed FAIL on missing repository implementation
- Completed: Task 4A2 — Repository contracts and canonical read bootstrap to GREEN
- Completed: Task 4B — Create/update/status write paths
- Completed: Task 5 — Fallback adapters and normalization
- Completed: Task 6 — Watcher, event publishing and reconcile flow
- Completed: Task 6A — Agent registry sync policy
- Completed: Task 7 — OpenCode capability matrix and host adapter
- Completed: Task 8 — Board state layer and renderer states
- Completed: Task 8A — Degraded diagnostics and resilience
- Completed: Task 9 — Board interactions
- Completed: Task 10 — Plugin wiring, E2E verification and packaging

## Результат
- Собран рабочий MVP `Kanban Plugin for Agentic IDEs` для `OpenCode Desktop` на file-first архитектуре
- Реализованы canonical/fallback repositories, transitions/preflight, watcher/event bridge, agent registry sync, OpenCode capability matrix, board UI, degraded diagnostics, interactions и plugin/app runtime wiring
- Добавлены `tests/e2e/plugin-mvp-flow.test.ts` и `docs/kanban-plugin/USAGE.md`

## Touched files
- Root/config: `.gitignore`, `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`
- Core/domain: `src/core/**`
- Discovery: `src/discovery/**`
- Repository/write/fallback: `src/repository/**`
- Watch/bridge: `src/watch/**`, `src/bridge/**`
- Host/OpenCode: `src/host/opencode/**`, `docs/kanban-plugin/opencode-capability-matrix.md`
- UI/state/view/interactions: `src/ui/**`
- Plugin entry/runtime: `src/plugin.ts`
- Tests: `tests/**`
- Docs/tasks: `docs/kanban-plugin/**`, `docs/superpowers/specs/2026-03-26-kanban-plugin-design.md`, `docs/superpowers/plans/2026-03-26-kanban-plugin-mvp.md`, `.tasks/**`

## Проверки
- Fresh final verification before closure:
  - `npm run test` — PASS (`19` files, `56` tests)
  - `npm run typecheck` — PASS
  - `npm run build` — PASS
- Additional focused suites were green throughout execution for repository, watcher/bridge, host capability matrix, UI rendering, degraded diagnostics, interactions and e2e flow

## Риски
- Финальный reviewer subagent в этой сессии несколько раз возвращал empty/interrupted result; closure выполнен по фактическому evidence (`test/typecheck/build`), а не по последнему formal reviewer verdict
- Current installed `@opencode-ai/plugin` подтверждает только export `tool`; live-host-only surfaces остаются зафиксированы через fallback/`unsupported-by-environment` до отдельной проверки в живом OpenCode host
- Git repo проекта пока локальный и весь статус идёт как untracked baseline, потому что пользователь не просил коммитов

## Next step
- При необходимости отдельным коротким проходом повторить final review pass уже вне этой нестабильной сессии reviewer tool
- Если нужно продолжать delivery: перейти к packaging/integration decision, decide on commit strategy, затем PR/branch workflow по запросу пользователя

## Current micro-slices
- Task 4A1: canonical repository RED integration test harness
- Task 4A2: repository contracts + canonical read bootstrap to GREEN
- Task 4B: create/update/status write paths + blocked_reason/metadata persistence
