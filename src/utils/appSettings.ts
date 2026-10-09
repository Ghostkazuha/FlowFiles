import type { AppSettings } from '../components/SettingsModal';
import {
  DEFAULT_SHORTCUT_BINDINGS,
  normalizeShortcut,
  SHORTCUT_ACTIONS,
  ShortcutBindings,
} from './keyboardShortcuts';

export const SETTINGS_STORAGE_KEY = 'flowfiles-settings';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: 'blue',
  showHiddenFiles: false,
  showFileExtensions: true,
  singleClickOpen: false,
  compactDensity: false,
  shortcutBindings: DEFAULT_SHORTCUT_BINDINGS,
};

function loadShortcutBindings(value: unknown): ShortcutBindings {
  const bindings = { ...DEFAULT_SHORTCUT_BINDINGS };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return bindings;

  const stored = value as Record<string, unknown>;
  const saved: Partial<Record<(typeof SHORTCUT_ACTIONS)[number]['id'], string>> = {};
  const defaultsToRestore: Array<(typeof SHORTCUT_ACTIONS)[number]['id']> = [];

  for (const action of SHORTCUT_ACTIONS) {
    if (!Object.prototype.hasOwnProperty.call(stored, action.id)) continue;
    const rawBinding = stored[action.id];
    if (rawBinding === '') {
      saved[action.id] = '';
      continue;
    }
    if (typeof rawBinding === 'string') {
      const normalized = normalizeShortcut(rawBinding);
      if (normalized) {
        saved[action.id] = normalized;
        continue;
      }
    }
    defaultsToRestore.push(action.id);
  }

  const used = new Set<string>();
  for (const action of SHORTCUT_ACTIONS) {
    const binding = saved[action.id];
    if (binding === undefined || binding === '') continue;
    if (used.has(binding)) {
      console.warn(`Ignoring duplicate saved shortcut "${binding}" for ${action.id}.`);
      saved[action.id] = '';
      continue;
    }
    used.add(binding);
  }

  for (const action of SHORTCUT_ACTIONS) {
    if (saved[action.id] !== undefined) {
      bindings[action.id] = saved[action.id]!;
      continue;
    }
    const defaultBinding = action.defaultShortcut;
    if (used.has(defaultBinding)) {
      if (defaultsToRestore.includes(action.id)) {
        console.warn(`Restored default shortcut for ${action.id} conflicts with a saved binding.`);
      }
      bindings[action.id] = '';
    } else {
      bindings[action.id] = defaultBinding;
      used.add(defaultBinding);
    }
  }
  return bindings;
}

export function loadAppSettings(): AppSettings {
  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_APP_SETTINGS;

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_APP_SETTINGS;

    const values = parsed as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...values,
      theme:
        values.theme === 'light' || values.theme === 'system'
          ? values.theme
          : 'dark',
      accentColor:
        values.accentColor === 'purple' ||
        values.accentColor === 'emerald' ||
        values.accentColor === 'amber'
          ? values.accentColor
          : 'blue',
      showHiddenFiles:
        typeof values.showHiddenFiles === 'boolean'
          ? values.showHiddenFiles
          : DEFAULT_APP_SETTINGS.showHiddenFiles,
      showFileExtensions:
        typeof values.showFileExtensions === 'boolean'
          ? values.showFileExtensions
          : DEFAULT_APP_SETTINGS.showFileExtensions,
      singleClickOpen:
        typeof values.singleClickOpen === 'boolean'
          ? values.singleClickOpen
          : DEFAULT_APP_SETTINGS.singleClickOpen,
      compactDensity:
        typeof values.compactDensity === 'boolean'
          ? values.compactDensity
          : DEFAULT_APP_SETTINGS.compactDensity,
      shortcutBindings: loadShortcutBindings(values.shortcutBindings),
    };
  } catch (error) {
    console.error('Could not load saved FlowFiles settings.', error);
    return DEFAULT_APP_SETTINGS;
  }
}

export function applyAppAppearance(settings: AppSettings): void {
  const root = document.documentElement;
  const isDark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.classList.toggle('dark', isDark);
  root.dataset.accent = settings.accentColor;
  root.dataset.compactDensity = String(settings.compactDensity);
}

export function getDisplayName(
  name: string,
  extension: string | undefined,
  isDirectory: boolean,
  showFileExtensions: boolean
): string {
  if (showFileExtensions || isDirectory || !extension) return name;
  const suffix = `.${extension}`;
  return name.toLowerCase().endsWith(suffix.toLowerCase())
    ? name.slice(0, -suffix.length)
    : name;
}
