export interface ProjectRuntime {
  current: string;
}

export interface InitialProjectRootOptions {
  env: Record<string, string | undefined>;
  cwd: string;
}

export type ProjectRootInput = string | ProjectRuntime;

export function createProjectRuntime(initial: string): ProjectRuntime {
  return { current: initial };
}

export function resolveInitialProjectRoot(options: InitialProjectRootOptions): string {
  const envDir = options.env.OPENKANBAN_PROJECT_DIR?.trim();
  if (envDir) {
    return envDir;
  }
  return options.cwd;
}

export function getProjectRoot(input: ProjectRootInput): string {
  return typeof input === 'string' ? input : input.current;
}
