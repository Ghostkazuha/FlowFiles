export type ShortcutCategory =
  | 'Navigation'
  | 'Tabs and windows'
  | 'File operations'
  | 'Search'
  | 'View and layout'
  | 'Application and settings';

export const SHORTCUT_ACTIONS = [
  {
    id: 'go-back',
    name: 'Back',
    description: 'Go to the previous location.',
    category: 'Navigation',
    defaultShortcut: 'Alt+Left',
  },
  {
    id: 'go-forward',
    name: 'Forward',
    description: 'Go to the next location.',
    category: 'Navigation',
    defaultShortcut: 'Alt+Right',
  },
  {
    id: 'go-up',
    name: 'Go up one folder',
    description: 'Navigate to the parent folder.',
    category: 'Navigation',
    defaultShortcut: 'Alt+Up',
  },
  {
    id: 'refresh',
    name: 'Refresh directory',
    description: 'Reload the current directory.',
    category: 'Navigation',
    defaultShortcut: 'F5',
  },
  {
    id: 'new-tab',
    name: 'New tab',
    description: 'Open a new file browser tab.',
    category: 'Tabs and windows',
    defaultShortcut: 'Ctrl+T',
  },
  {
    id: 'close-tab',
    name: 'Close tab',
    description: 'Close the current tab when more than one is open.',
    category: 'Tabs and windows',
    defaultShortcut: 'Ctrl+W',
  },
  {
    id: 'create-folder',
    name: 'Create folder',
    description: 'Create a folder in the current location.',
    category: 'File operations',
    defaultShortcut: 'Ctrl+Shift+N',
    requiresWritableFileSystem: true,
  },
  {
    id: 'rename-item',
    name: 'Rename selected item',
    description: 'Rename the selected file or folder.',
    category: 'File operations',
    defaultShortcut: 'F2',
    requiresWritableFileSystem: true,
  },
  {
    id: 'recycle-selected',
    name: 'Move selected items to Recycle Bin',
    description: 'Recycle selected files or folders; requires a selection and is unavailable inside Recycle Bin.',
    category: 'File operations',
    defaultShortcut: 'Delete',
    requiresWritableFileSystem: true,
  },
  {
    id: 'focus-search',
    name: 'Focus search',
    description: 'Move focus to the file search field.',
    category: 'Search',
    defaultShortcut: 'Ctrl+F',
    allowInEditable: true,
  },
  {
    id: 'focus-address',
    name: 'Focus address bar',
    description: 'Move focus to the current path field.',
    category: 'Navigation',
    defaultShortcut: 'Ctrl+L',
    allowInEditable: true,
  },
  {
    id: 'switch-view',
    name: 'Toggle list/grid view',
    description: 'Switch between compact list and grid layouts.',
    category: 'View and layout',
    defaultShortcut: 'Ctrl+Shift+V',
  },
  {
    id: 'toggle-details',
    name: 'Toggle details panel',
    description: 'Show or hide the details and preview panel.',
    category: 'View and layout',
    defaultShortcut: 'Alt+Shift+P',
  },
  {
    id: 'toggle-split-pane',
    name: 'Toggle split pane',
    description: 'Show or hide the secondary file browser pane.',
    category: 'View and layout',
    defaultShortcut: 'Ctrl+Backslash',
  },
  {
    id: 'open-command-palette',
    name: 'Open command palette',
    description: 'Search and run available commands.',
    category: 'Application and settings',
    defaultShortcut: 'Ctrl+Shift+P',
  },
  {
    id: 'open-settings',
    name: 'Open settings',
    description: 'Open FlowFiles settings.',
    category: 'Application and settings',
    defaultShortcut: 'Ctrl+Comma',
  },
  {
    id: 'show-properties',
    name: 'Show file properties',
    description: 'Open properties for the selected item.',
    category: 'File operations',
    defaultShortcut: 'Alt+Enter',
  },
] as const satisfies ReadonlyArray<{
  id: string;
  name: string;
  description: string;
  category: ShortcutCategory;
  defaultShortcut: string;
  allowInEditable?: boolean;
  requiresWritableFileSystem?: boolean;
}>;

export type ShortcutId = (typeof SHORTCUT_ACTIONS)[number]['id'];
export type ShortcutBindings = Record<ShortcutId, string>;

export const DEFAULT_SHORTCUT_BINDINGS = Object.fromEntries(
  SHORTCUT_ACTIONS.map(({ id, defaultShortcut }) => [id, defaultShortcut])
) as ShortcutBindings;

const specialKeyNames: Record<string, string> = {
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  Escape: 'Escape',
  Esc: 'Escape',
  ' ': 'Space',
  ',': 'Comma',
  '\\': 'Backslash',
  '+': 'Plus',
  '.': 'Period',
  '/': 'Slash',
  '-': 'Minus',
  '=': 'Equal',
  '[': 'BracketLeft',
  ']': 'BracketRight',
  ';': 'Semicolon',
  "'": 'Quote',
  '`': 'Backquote',
};
const keyCodeNames: Record<string, string> = {
  Comma: 'Comma',
  Period: 'Period',
  Slash: 'Slash',
  Backslash: 'Backslash',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight',
  Semicolon: 'Semicolon',
  Quote: 'Quote',
  Backquote: 'Backquote',
  Minus: 'Minus',
  Equal: 'Equal',
};
const supportedNamedKeys = new Set([
  'Backspace',
  'Delete',
  'End',
  'Enter',
  'Home',
  'Insert',
  'PageDown',
  'PageUp',
  'Space',
  'Tab',
  'Left',
  'Right',
  'Up',
  'Down',
  'Escape',
  'Comma',
  'Backslash',
  'Plus',
  'Period',
  'Slash',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Semicolon',
  'Quote',
  'Backquote',
]);

function normalizeKey(key: string): string | null {
  const mapped = specialKeyNames[key] || key;
  if (/^[a-z]$/i.test(mapped)) return mapped.toUpperCase();
  if (/^[0-9]$/.test(mapped) || /^F(?:[1-9]|1[0-9]|2[0-4])$/.test(mapped)) {
    return mapped.toUpperCase();
  }
  if (supportedNamedKeys.has(mapped)) return mapped;
  if (supportedNamedKeys.has(key)) return key;
  return null;
}

function orderModifiers(modifiers: Set<string>, key: string): string {
  return [
    modifiers.has('Ctrl') ? 'Ctrl' : null,
    modifiers.has('Alt') ? 'Alt' : null,
    modifiers.has('Shift') ? 'Shift' : null,
    key,
  ]
    .filter((part): part is string => part !== null)
    .join('+');
}

export function normalizeShortcut(value: string): string | null {
  const tokens = value.split('+').map((token) => token.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  const modifiers = new Set<string>();
  let key: string | null = null;

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    const modifier =
      lowerToken === 'ctrl' || lowerToken === 'control'
        ? 'Ctrl'
        : lowerToken === 'alt'
          ? 'Alt'
          : lowerToken === 'shift'
            ? 'Shift'
            : null;
    if (modifier) {
      if (modifiers.has(modifier)) return null;
      modifiers.add(modifier);
    } else {
      if (key !== null) return null;
      key = normalizeKey(token);
      if (!key) return null;
    }
  }

  if (!key) return null;
  return orderModifiers(modifiers, key);
}

export function shortcutFromKeyboardEvent(event: KeyboardEvent): string | null {
  const modifiers = new Set<string>();
  if (event.ctrlKey || event.metaKey) modifiers.add('Ctrl');
  if (event.altKey) modifiers.add('Alt');
  if (event.shiftKey) modifiers.add('Shift');
  const key = normalizeKey(event.key) || keyCodeNames[event.code] || null;
  return key ? orderModifiers(modifiers, key) : null;
}

export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: string
): boolean {
  const normalized = normalizeShortcut(shortcut);
  return normalized !== null && shortcutFromKeyboardEvent(event) === normalized;
}

export function formatShortcutForDisplay(shortcut: string | undefined): string {
  if (!shortcut) return '';
  return shortcut
    .replace(/\bComma\b/g, ',')
    .replace(/\bBackslash\b/g, '\\')
    .replace(/\bPlus\b/g, '+');
}

export function formatShortcutTitle(label: string, shortcut: string | undefined): string {
  const display = formatShortcutForDisplay(shortcut);
  return display ? `${label} (${display})` : label;
}

export function isShortcutAvailable(
  id: ShortcutId,
  isNative: boolean
): boolean {
  const action = SHORTCUT_ACTIONS.find((item) => item.id === id);
  return Boolean(
    action &&
      !(isNative && 'requiresWritableFileSystem' in action && action.requiresWritableFileSystem)
  );
}

export function getShortcutAction(id: ShortcutId) {
  return SHORTCUT_ACTIONS.find((action) => action.id === id)!;
}
