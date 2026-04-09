import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { discoverResources } from '@openkanban/sidecar';

describe('discoverResources', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'discover-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('discovers agents from board.yml', () => {
    const tasksDir = path.join(tmpDir, '.tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(tasksDir, 'board.yml'),
      [
        'agents:',
        '  - name: planner',
        '  - name: coder',
      ].join('\n'),
    );

    const resources = discoverResources(tmpDir);

    expect(resources).toEqual([
      { kind: 'agent', name: 'planner', available: true },
      { kind: 'agent', name: 'coder', available: true },
    ]);
  });

  it('returns empty array when no resources exist', () => {
    const resources = discoverResources(tmpDir);
    expect(resources).toEqual([]);
  });

  it('discovers skills from skills/ directory', () => {
    const skillsDir = path.join(tmpDir, 'skills');
    fs.mkdirSync(path.join(skillsDir, 'tdd'), { recursive: true });
    fs.mkdirSync(path.join(skillsDir, 'debugging'), { recursive: true });

    const resources = discoverResources(tmpDir);

    expect(resources).toContainEqual({ kind: 'skill', name: 'tdd', available: true });
    expect(resources).toContainEqual({ kind: 'skill', name: 'debugging', available: true });
    expect(resources).toHaveLength(2);
  });

  it('discovers MCP servers from opencode.json', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'opencode.json'),
      JSON.stringify({
        servers: {
          'tavily': { command: 'tavily-mcp' },
          'github': { command: 'gh-mcp' },
        },
      }),
    );

    const resources = discoverResources(tmpDir);

    expect(resources).toContainEqual({ kind: 'mcp', name: 'tavily', available: true });
    expect(resources).toContainEqual({ kind: 'mcp', name: 'github', available: true });
    expect(resources).toHaveLength(2);
  });

  it('combines resources from all sources', () => {
    // board.yml with agents
    const tasksDir = path.join(tmpDir, '.tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.writeFileSync(
      path.join(tasksDir, 'board.yml'),
      'agents:\n  - name: orchestrator\n',
    );

    // skills directory
    const skillsDir = path.join(tmpDir, 'skills');
    fs.mkdirSync(path.join(skillsDir, 'review'), { recursive: true });

    // opencode.json with MCP
    fs.writeFileSync(
      path.join(tmpDir, 'opencode.json'),
      JSON.stringify({ servers: { perplexity: {} } }),
    );

    const resources = discoverResources(tmpDir);

    expect(resources).toHaveLength(3);
    expect(resources.find((r) => r.kind === 'agent')?.name).toBe('orchestrator');
    expect(resources.find((r) => r.kind === 'skill')?.name).toBe('review');
    expect(resources.find((r) => r.kind === 'mcp')?.name).toBe('perplexity');
  });
});
