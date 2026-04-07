export type ResourceKind = 'agent' | 'skill' | 'mcp' | 'tool';

export interface ResourceRecord {
  kind: ResourceKind;
  name: string;
  description?: string;
  available: boolean;
  meta?: Record<string, unknown>;
}

export interface ResourceAssignment {
  kind: ResourceKind;
  name: string;
  required: boolean;
}
