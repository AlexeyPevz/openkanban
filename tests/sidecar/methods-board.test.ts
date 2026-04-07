import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import matter from 'gray-matter';
import { createBoardMethods, createTaskMethods } from '@neon-tiger/sidecar';

async function createTestWorkspace(): Promise<string> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'sidecar-test-'));
  const tasksDir = join(tmpDir, '.tasks');
  const tasksSubDir = join(tasksDir, 'tasks');
  await mkdir(tasksSubDir, { recursive: true });

  await writeFile(
    join(tasksDir, 'board.yml'),
    `id: test-board
title: Test Board
columns:
  - id: planned
    title: Planned
  - id: active
    title: Active
  - id: done
    title: Done
`,
  );

  const taskContent = matter.stringify('', {
    id: 'sample-task',
    title: 'Sample Task',
    status: 'planned',
    source_file: '.tasks/tasks/sample-task.md',
    updated_at: '2026-01-01T00:00:00.000Z',
    required_agents: [],
    required_skills: [],
    artifacts: [],
    metadata: {},
  });
  await writeFile(join(tasksSubDir, 'sample-task.md'), taskContent);

  return tmpDir;
}

describe('board methods', () => {
  let tmpDir: string;
  let boardMethods: ReturnType<typeof createBoardMethods>;

  beforeEach(async () => {
    tmpDir = await createTestWorkspace();
    boardMethods = createBoardMethods(tmpDir);
  });

  it('board.load returns board with tasks and diagnostics', async () => {
    const result = await boardMethods['board.load']({});
    expect(result).toMatchObject({
      state: 'success',
      board: {
        id: 'test-board',
        title: 'Test Board',
      },
    });
    const typed = result as { tasks: unknown[] };
    expect(typed.tasks).toHaveLength(1);
    expect(typed.tasks[0]).toMatchObject({ id: 'sample-task' });
  });
});

describe('task methods', () => {
  let tmpDir: string;
  let taskMethods: ReturnType<typeof createTaskMethods>;

  beforeEach(async () => {
    tmpDir = await createTestWorkspace();
    taskMethods = createTaskMethods(tmpDir);
  });

  it('task.list returns all tasks', async () => {
    const tasks = (await taskMethods['task.list']({})) as unknown[];
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({ id: 'sample-task' });
  });

  it('task.get returns specific task', async () => {
    const task = await taskMethods['task.get']({ id: 'sample-task' });
    expect(task).toMatchObject({
      id: 'sample-task',
      title: 'Sample Task',
      status: 'planned',
    });
  });

  it('task.get throws for unknown task', async () => {
    await expect(
      taskMethods['task.get']({ id: 'nonexistent' }),
    ).rejects.toThrow('Task not found: nonexistent');
  });

  it('task.create creates a new task', async () => {
    const task = await taskMethods['task.create']({
      title: 'New Task',
      status: 'planned',
    });
    expect(task).toMatchObject({
      title: 'New Task',
      status: 'planned',
    });
    expect((task as { id: string }).id).toBe('new-task');

    // Verify it's persisted
    const tasks = (await taskMethods['task.list']({})) as unknown[];
    expect(tasks).toHaveLength(2);
  });

  it('task.move transitions status', async () => {
    const moved = await taskMethods['task.move']({
      id: 'sample-task',
      status: 'active',
    });
    expect((moved as { status: string }).status).toBe('active');
  });

  it('task.move rejects invalid transition', async () => {
    await expect(
      taskMethods['task.move']({ id: 'sample-task', status: 'done' }),
    ).rejects.toThrow();
  });

  it('task.update updates task metadata', async () => {
    const updated = await taskMethods['task.update']({
      id: 'sample-task',
      title: 'Updated Title',
    });
    expect((updated as { title: string }).title).toBe('Updated Title');
  });
});
