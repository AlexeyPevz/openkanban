import type { ResourceAssignment } from './types.js';

export function normalizeResources(
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
