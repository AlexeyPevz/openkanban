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

const defaultTheme: ThemeVars = {
  '--kanban-bg': '#1a1b26',
  '--kanban-column-bg': '#24283b',
  '--kanban-card-bg': '#2f3549',
  '--kanban-card-border': '#414868',
  '--kanban-text': '#c0caf5',
  '--kanban-text-secondary': '#565f89',
  '--kanban-accent': '#7aa2f7',
  '--kanban-danger': '#f7768e',
  '--kanban-success': '#9ece6a',
  '--kanban-radius': '8px',
  '--kanban-shadow': '0 2px 8px rgba(0,0,0,0.3)',
};

let currentTheme = $state<ThemeVars>({ ...defaultTheme });
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
  applyTheme({ ...defaultTheme }, 'opencode');
}
