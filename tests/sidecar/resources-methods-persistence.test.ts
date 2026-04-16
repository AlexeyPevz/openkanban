import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createResourceMethods, createTaskMethods } from '@openkanban/sidecar';

async function createWorkspace(initialResources?: Array<{ kind: 'agent' | 'skill' | 'mcp' | 'tool'; name: string; required: boolean }>): Promise<string> {
  const rootDir = await mkdtemp(join(tmpdir(), 'resources-methods-'));
  const tasksDir = join(rootDir, '.tasks', 'tasks');
  await mkdir(tasksDir, { recursive: true });

  const content = matter.stringify('', {
    id: 'sample-task',
    title: 'Sample Task',
    status: 'planned',
    source_file: '.tasks/tasks/sample-task.md',
    updated_at: '2026-01-01T00:00:00.000Z',
    required_agents: [],
    required_skills: [],
    artifacts: [],
    ...(initialResources ? { resources: initialResources } : {}),
    metadata: {},
  });

  await writeFile(join(tasksDir, 'sample-task.md'), content);
  return rootDir;
}

describe('resources methods persistence', () => {
  let rootDir: string;

  afterEach(async () => {
    if (rootDir) {
      await rm(rootDir, { recursive: true, force: true });
    }
  });

  beforeEach(async () => {
    rootDir = await createWorkspace();
  });

  it('resources.assign persists resource into frontmatter and reread task', async () => {
    const resourcesMethods = createResourceMethods(rootDir);
    const taskMethods = createTaskMethods(rootDir);

    await resourcesMethods['resources.assign']({
      taskId: 'sample-task',
      kind: 'skill',
      name: 'testing-tdd',
    });

    const rawTask = await readFile(join(rootDir, '.tasks', 'tasks', 'sample-task.md'), 'utf8');
    const parsed = matter(rawTask);
    expect(parsed.data.resources).toEqual([
      { kind: 'skill', name: 'testing-tdd', required: true },
    ]);

    const task = await taskMethods['task.get']({ id: 'sample-task' }) as { resources: Array<{ kind: string; name: string; required: boolean }> };
    expect(task.resources).toEqual([
      { kind: 'skill', name: 'testing-tdd', required: true },
    ]);
  });

  it('resources.unassign removes resource from frontmatter and reread task', async () => {
    rootDir = await createWorkspace([
      { kind: 'agent', name: 'backend', required: true },
    ]);

    const resourcesMethods = createResourceMethods(rootDir);
    const taskMethods = createTaskMethods(rootDir);

    await resourcesMethods['resources.unassign']({
      taskId: 'sample-task',
      kind: 'agent',
      name: 'backend',
    });

    const rawTask = await readFile(join(rootDir, '.tasks', 'tasks', 'sample-task.md'), 'utf8');
    const parsed = matter(rawTask);
    expect(parsed.data.resources).toBeUndefined();

    const task = await taskMethods['task.get']({ id: 'sample-task' }) as { resources: Array<{ kind: string; name: string; required: boolean }> };
    expect(task.resources).toEqual([]);
  });

  it('resources.assign writes into switched runtime root', async () => {
    const rootDirA = rootDir;
    const rootDirB = await createWorkspace();
    rootDir = rootDirB;

    const runtime = { current: rootDirA };
    const resourcesMethods = createResourceMethods(runtime);
    const taskMethods = createTaskMethods(runtime);

    runtime.current = rootDirB;
    await resourcesMethods['resources.assign']({
      taskId: 'sample-task',
      kind: 'skill',
      name: 'testing-tdd',
    });

    const rawB = await readFile(join(rootDirB, '.tasks', 'tasks', 'sample-task.md'), 'utf8');
    const parsedB = matter(rawB);
    expect(parsedB.data.resources).toEqual([
      { kind: 'skill', name: 'testing-tdd', required: true },
    ]);

    const rawA = await readFile(join(rootDirA, '.tasks', 'tasks', 'sample-task.md'), 'utf8');
    const parsedA = matter(rawA);
    expect(parsedA.data.resources).toBeUndefined();

    const task = await taskMethods['task.get']({ id: 'sample-task' }) as { resources: Array<{ kind: string; name: string; required: boolean }> };
    expect(task.resources).toEqual([
      { kind: 'skill', name: 'testing-tdd', required: true },
    ]);
  });

  it('resources.unassign writes into switched runtime root', async () => {
    const rootDirA = rootDir;
    const rootDirB = await createWorkspace([
      { kind: 'agent', name: 'backend', required: true },
    ]);
    rootDir = rootDirB;

    const runtime = { current: rootDirA };
    const resourcesMethods = createResourceMethods(runtime);
    const taskMethods = createTaskMethods(runtime);

    runtime.current = rootDirB;
    await resourcesMethods['resources.unassign']({
      taskId: 'sample-task',
      kind: 'agent',
      name: 'backend',
    });

    const rawB = await readFile(join(rootDirB, '.tasks', 'tasks', 'sample-task.md'), 'utf8');
    const parsedB = matter(rawB);
    expect(parsedB.data.resources).toBeUndefined();

    const rawA = await readFile(join(rootDirA, '.tasks', 'tasks', 'sample-task.md'), 'utf8');
    const parsedA = matter(rawA);
    expect(parsedA.data.resources).toBeUndefined();

    const task = await taskMethods['task.get']({ id: 'sample-task' }) as { resources: Array<{ kind: string; name: string; required: boolean }> };
    expect(task.resources).toEqual([]);
  });
});
