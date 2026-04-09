/**
 * Browser-safe task resource helpers for the desktop WebView bundle.
 *
 * These functions duplicate the logic from @openkanban/core's
 * `normalizeResources` WITHOUT importing the core barrel, which would
 * pull Node-only modules (node:fs, node:path, etc.) into the browser bundle
 * and crash the WebView before Svelte mounts.
 *
 * Type-only imports from @openkanban/core are safe — they are erased at
 * compile time and produce no runtime import statements.
 */

import type { TaskCard } from '@openkanban/core';

type ResourceKind = 'agent' | 'skill' | 'mcp' | 'tool';

interface ResourceAssignment {
  kind: ResourceKind;
  name: string;
  required: boolean;
}

function normalizeResources(
  resources?: ResourceAssignment[],
  requiredAgents?: string[],
  requiredSkills?: string[],
): ResourceAssignment[] {
  const merged: ResourceAssignment[] = [...(resources ?? [])];
  const seen = new Set(merged.map((r) => `${r.kind}:${r.name}`));

  for (const name of requiredAgents ?? []) {
    const key = `agent:${name}`;
    if (!seen.has(key)) {
      merged.push({ kind: 'agent', name, required: true });
      seen.add(key);
    }
  }

  for (const name of requiredSkills ?? []) {
    const key = `skill:${name}`;
    if (!seen.has(key)) {
      merged.push({ kind: 'skill', name, required: true });
      seen.add(key);
    }
  }

  return merged;
}

export function getTaskResources(task: TaskCard): ResourceAssignment[] {
  return normalizeResources(
    task.resources,
    task.required_agents,
    task.required_skills,
  );
}
