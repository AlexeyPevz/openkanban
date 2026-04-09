import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ResourceRecord } from '@openkanban/core';

/**
 * Scan project directory for available resources:
 * - agents from .tasks/board.yml (lines matching `- name: xxx`)
 * - skills from skills/ directory (subdirectory names)
 * - MCP servers from opencode.json (servers keys)
 */
export function discoverResources(projectDir: string): ResourceRecord[] {
  const resources: ResourceRecord[] = [];

  // 1. Scan board.yml for agents
  const boardPath = path.join(projectDir, '.tasks', 'board.yml');
  if (fs.existsSync(boardPath)) {
    const content = fs.readFileSync(boardPath, 'utf-8');
    const agentMatches = content.matchAll(/- name:\s*(.+)/g);
    for (const match of agentMatches) {
      const name = match[1].trim();
      if (name) {
        resources.push({
          kind: 'agent',
          name,
          available: true,
        });
      }
    }
  }

  // 2. Scan skills/ directory for skill subdirectories
  const skillsDir = path.join(projectDir, 'skills');
  if (fs.existsSync(skillsDir) && fs.statSync(skillsDir).isDirectory()) {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        resources.push({
          kind: 'skill',
          name: entry.name,
          available: true,
        });
      }
    }
  }

  // 3. Scan opencode.json for MCP servers
  const opencodeJsonPath = path.join(projectDir, 'opencode.json');
  if (fs.existsSync(opencodeJsonPath)) {
    try {
      const raw = fs.readFileSync(opencodeJsonPath, 'utf-8');
      const config = JSON.parse(raw) as { servers?: Record<string, unknown> };
      if (config.servers && typeof config.servers === 'object') {
        for (const serverName of Object.keys(config.servers)) {
          resources.push({
            kind: 'mcp',
            name: serverName,
            available: true,
          });
        }
      }
    } catch {
      // Invalid JSON — skip silently
    }
  }

  return resources;
}
