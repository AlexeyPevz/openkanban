import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import {
  createBoardMethods,
  createTaskMethods,
  createResourceMethods,
  createProjectMethods,
} from '@openkanban/sidecar';

function createProjectRuntime(initial: string): { current: string } {
  return { current: initial };
}

async function createWorkspace(rootDir: string, boardTitle: string, taskId: string, skillName: string): Promise<void> {
  const tasksDir = join(rootDir, '.tasks', 'tasks');
  await mkdir(tasksDir, { recursive: true });

  await writeFile(
    join(rootDir, '.tasks', 'board.yml'),
    `id: ${taskId}-board\ntitle: ${boardTitle}\ncolumns:\n  - id: planned\n    title: Planned\n  - id: active\n    title: Active\n  - id: done\n    title: Done\n`,
  );

  const taskContent = matter.stringify('', {
    id: taskId,
    title: `${taskId} title`,
    status: 'planned',
    source_file: `.tasks/tasks/${taskId}.md`,
    updated_at: '2026-01-01T00:00:00.000Z',
    required_agents: [],
    required_skills: [],
    artifacts: [],
    metadata: {},
  });
  await writeFile(join(tasksDir, `${taskId}.md`), taskContent);

  await mkdir(join(rootDir, 'skills', skillName), { recursive: true });
}

async function readTaskFrontmatter(rootDir: string, taskId: string): Promise<Record<string, unknown>> {
  const rawTask = await readFile(join(rootDir, '.tasks', 'tasks', `${taskId}.md`), 'utf8');
  return matter(rawTask).data as Record<string, unknown>;
}

describe('runtime-root method reads', () => {
  let projectA: string;
  let projectB: string;

  beforeEach(async () => {
    projectA = await mkdtemp(join(tmpdir(), 'runtime-a-'));
    projectB = await mkdtemp(join(tmpdir(), 'runtime-b-'));

    await createWorkspace(projectA, 'Project A', 'project-a-task', 'project-a-skill');
    await createWorkspace(projectB, 'Project B', 'project-b-task', 'project-b-skill');
  });

  it('board.load reads from runtime.current after mutation', async () => {
    const runtime = createProjectRuntime(projectA);
    const boardMethods = createBoardMethods(runtime);

    runtime.current = projectB;
    const result = await boardMethods['board.load']({}) as { board: { title: string }; tasks: Array<{ id: string }> };

    expect(result.board.title).toBe('Project B');
    expect(result.tasks[0]?.id).toBe('project-b-task');
  });

  it('task.list reads from runtime.current after mutation', async () => {
    const runtime = createProjectRuntime(projectA);
    const taskMethods = createTaskMethods(runtime);

    runtime.current = projectB;
    const tasks = await taskMethods['task.list']({}) as Array<{ id: string }>;

    expect(tasks.map((t) => t.id)).toContain('project-b-task');
    expect(tasks.map((t) => t.id)).not.toContain('project-a-task');
  });

  it('resources.discover uses runtime.current after mutation', async () => {
    const runtime = createProjectRuntime(projectA);
    const resourcesMethods = createResourceMethods(runtime);

    runtime.current = projectB;
    const resources = await resourcesMethods['resources.discover']({}) as Array<{ kind: string; name: string }>;

    const skills = resources.filter((r) => r.kind === 'skill').map((r) => r.name);
    expect(skills).toContain('project-b-skill');
    expect(skills).not.toContain('project-a-skill');
  });

  it('resources.list does not leak stale cache after runtime root switch', async () => {
    const runtime = createProjectRuntime(projectA);
    const resourcesMethods = createResourceMethods(runtime);

    await resourcesMethods['resources.discover']({});
    const before = await resourcesMethods['resources.list']({}) as Array<{ kind: string; name: string }>;
    expect(before.some((r) => r.name === 'project-a-skill')).toBe(true);

    runtime.current = projectB;
    const afterSwitch = await resourcesMethods['resources.list']({}) as Array<{ kind: string; name: string }>;
    expect(afterSwitch).toEqual([]);
  });
});

describe('project methods', () => {
  it('project.current returns current runtime directory', async () => {
    const runtime = createProjectRuntime('/tmp/current-project');
    const methods = createProjectMethods(runtime, {
      restartWatcher: async () => {},
    });

    await expect(methods['project.current']({})).resolves.toEqual({
      directory: '/tmp/current-project',
    });
  });

  it('project.rebind returns rebound=false for same directory', async () => {
    const runtime = createProjectRuntime('/tmp/current-project');
    let restartCalls = 0;
    const methods = createProjectMethods(runtime, {
      restartWatcher: async () => {
        restartCalls += 1;
      },
    });

    await expect(
      methods['project.rebind']({ directory: '/tmp/current-project' }),
    ).resolves.toEqual({
      directory: '/tmp/current-project',
      rebound: false,
    });
    expect(restartCalls).toBe(0);
    expect(runtime.current).toBe('/tmp/current-project');
  });

  it('project.rebind updates runtime and restarts watcher on new directory', async () => {
    const runtime = createProjectRuntime('/tmp/project-a');
    const restarted: string[] = [];
    const methods = createProjectMethods(runtime, {
      restartWatcher: async (directory) => {
        restarted.push(directory);
      },
      validateRoot: () => {},
    });

    await expect(
      methods['project.rebind']({ directory: '/tmp/project-b' }),
    ).resolves.toEqual({
      directory: '/tmp/project-b',
      rebound: true,
    });
    expect(restarted).toEqual(['/tmp/project-b']);
    expect(runtime.current).toBe('/tmp/project-b');
  });

  it('project.rebind keeps previous runtime when restart fails', async () => {
    const runtime = createProjectRuntime('/tmp/project-a');
    const methods = createProjectMethods(runtime, {
      restartWatcher: async () => {
        throw new Error('restart failed');
      },
      validateRoot: () => {},
    });

    await expect(
      methods['project.rebind']({ directory: '/tmp/project-b' }),
    ).rejects.toThrow('restart failed');
    expect(runtime.current).toBe('/tmp/project-a');
  });
});

describe('runtime-root task write methods', () => {
  let projectA: string;
  let projectB: string;

  beforeEach(async () => {
    projectA = await mkdtemp(join(tmpdir(), 'runtime-write-a-'));
    projectB = await mkdtemp(join(tmpdir(), 'runtime-write-b-'));

    await createWorkspace(projectA, 'Project A', 'shared-task', 'project-a-skill');
    await createWorkspace(projectB, 'Project B', 'shared-task', 'project-b-skill');
  });

  it('task.create writes into switched runtime root', async () => {
    const runtime = createProjectRuntime(projectA);
    const taskMethods = createTaskMethods(runtime);

    runtime.current = projectB;
    const created = await taskMethods['task.create']({
      title: 'Switched Create Task',
      status: 'planned',
    }) as { id: string };

    const inB = await readTaskFrontmatter(projectB, created.id);
    expect(inB.title).toBe('Switched Create Task');

    await expect(
      readFile(join(projectA, '.tasks', 'tasks', `${created.id}.md`), 'utf8'),
    ).rejects.toThrow();
  });

  it('task.update writes into switched runtime root', async () => {
    const runtime = createProjectRuntime(projectA);
    const taskMethods = createTaskMethods(runtime);

    runtime.current = projectB;
    await taskMethods['task.update']({
      id: 'shared-task',
      title: 'Updated In Project B',
    });

    const inB = await readTaskFrontmatter(projectB, 'shared-task');
    expect(inB.title).toBe('Updated In Project B');

    const inA = await readTaskFrontmatter(projectA, 'shared-task');
    expect(inA.title).toBe('shared-task title');
  });

  it('task.move writes into switched runtime root', async () => {
    const runtime = createProjectRuntime(projectA);
    const taskMethods = createTaskMethods(runtime);

    runtime.current = projectB;
    await taskMethods['task.move']({
      id: 'shared-task',
      status: 'active',
    });

    const inB = await readTaskFrontmatter(projectB, 'shared-task');
    expect(inB.status).toBe('active');

    const inA = await readTaskFrontmatter(projectA, 'shared-task');
    expect(inA.status).toBe('planned');
  });
});
