import opencodePreset from '../themes/opencode.json';
import lightPreset from '../themes/light.json';

export interface ThemeVars {
  '--kanban-bg': string;
  '--kanban-column-bg': string;
  '--kanban-card-bg': string;
  '--kanban-card-border': string;
  '--kanban-text': string;
  '--kanban-text-secondary': string;
  '--kanban-accent': string;
  '--kanban-danger': string;
  '--kanban-success': string;
  '--kanban-radius': string;
  '--kanban-shadow': string;
}

export interface ThemePreset {
  name: string;
  label: string;
  vars: ThemeVars;
}

export const presets: ThemePreset[] = [
  opencodePreset as ThemePreset,
  lightPreset as ThemePreset,
];

let currentTheme = $state<ThemeVars>({ ...(opencodePreset.vars as ThemeVars) });
let themeName = $state('opencode');

export function getTheme(): ThemeVars {
  return currentTheme;
}

export function getThemeName(): string {
  return themeName;
}

export function applyTheme(vars: ThemeVars, name?: string): void {
  currentTheme = vars;
  if (name) themeName = name;
  for (const [key, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(key, value);
  }
}

export function resetTheme(): void {
  applyTheme({ ...(opencodePreset.vars as ThemeVars) }, 'opencode');
}

export function loadPreset(name: string): void {
  const preset = presets.find((p) => p.name === name);
  if (preset) {
    applyTheme({ ...preset.vars }, preset.name);
  }
}

export function toggleTheme(): void {
  const currentIndex = presets.findIndex((p) => p.name === themeName);
  const nextIndex = (currentIndex + 1) % presets.length;
  const next = presets[nextIndex];
  applyTheme({ ...next.vars }, next.name);
}
