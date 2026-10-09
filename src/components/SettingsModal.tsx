import React, { useMemo, useState } from 'react';
import {
  X,
  Sun,
  Moon,
  Laptop,
  Check,
  Keyboard,
  Sliders,
  Search,
  RotateCcw,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import {
  getShortcutAction,
  formatShortcutForDisplay,
  isShortcutAvailable,
  shortcutFromKeyboardEvent,
  SHORTCUT_ACTIONS,
  ShortcutBindings,
  ShortcutId,
} from '../utils/keyboardShortcuts';

const reservedShortcuts = new Set([
  'Ctrl+T',
  'Ctrl+W',
  'Ctrl+N',
  'Ctrl+Shift+N',
  'Ctrl+L',
  'Ctrl+F',
  'Ctrl+R',
  'Ctrl+Shift+P',
  'Alt+Left',
  'Alt+Right',
  'F5',
]);

function isReservedShortcut(shortcut: string): boolean {
  return reservedShortcuts.has(shortcut);
}

const accentOptions: Array<{
  id: AppSettings['accentColor'];
  color: string;
  name: string;
}> = [
  { id: 'blue', color: 'bg-[#0ea5e9]', name: 'Windows Sky' },
  { id: 'purple', color: 'bg-purple-500', name: 'Mica Purple' },
  { id: 'emerald', color: 'bg-emerald-500', name: 'Emerald' },
  { id: 'amber', color: 'bg-amber-500', name: 'Amber' },
];

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  accentColor: 'blue' | 'purple' | 'emerald' | 'amber';
  showHiddenFiles: boolean;
  showFileExtensions: boolean;
  singleClickOpen: boolean;
  compactDensity: boolean;
  shortcutBindings: ShortcutBindings;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  isNative: boolean;
  onResetAllShortcuts: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  isNative,
  onResetAllShortcuts,
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'explorer' | 'shortcuts'>('appearance');
  const [shortcutQuery, setShortcutQuery] = useState('');
  const [editingShortcutId, setEditingShortcutId] = useState<ShortcutId | null>(null);
  const [recordedShortcut, setRecordedShortcut] = useState<string | null>(null);
  const [allowEscapeShortcut, setAllowEscapeShortcut] = useState(false);
  const [shortcutConflict, setShortcutConflict] = useState<ShortcutId | null>(null);
  const [shortcutWarning, setShortcutWarning] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  const filteredShortcutActions = useMemo(() => {
    const query = shortcutQuery.trim().toLowerCase();
    if (!query) return SHORTCUT_ACTIONS;
    const compactQuery = query.replace(/\s+/g, '');
    return SHORTCUT_ACTIONS.filter((action) => {
      const binding = settings.shortcutBindings[action.id] || '';
      return (
        action.name.toLowerCase().includes(query) ||
        action.description.toLowerCase().includes(query) ||
        formatShortcutForDisplay(binding).toLowerCase().replace(/\s+/g, '').includes(compactQuery) ||
        binding.toLowerCase().replace(/\s+/g, '').includes(compactQuery)
      );
    });
  }, [settings.shortcutBindings, shortcutQuery]);

  const beginShortcutEdit = (id: ShortcutId) => {
    setEditingShortcutId(id);
    setRecordedShortcut(null);
    setShortcutConflict(null);
    setShortcutWarning(false);
    setAllowEscapeShortcut(false);
  };

  const cancelShortcutEdit = () => {
    setEditingShortcutId(null);
    setRecordedShortcut(null);
    setShortcutConflict(null);
    setShortcutWarning(false);
  };

  const saveShortcut = (reassignConflict = false) => {
    if (!editingShortcutId || !recordedShortcut) return;
    if (isReservedShortcut(recordedShortcut) && !shortcutWarning) {
      setShortcutWarning(true);
      return;
    }
    const conflictingAction = SHORTCUT_ACTIONS.find(
      (action) =>
        action.id !== editingShortcutId &&
        settings.shortcutBindings[action.id] === recordedShortcut
    );
    if (conflictingAction && !reassignConflict) {
      setShortcutConflict(conflictingAction.id);
      return;
    }

    const shortcutBindings = { ...settings.shortcutBindings };
    if (conflictingAction) shortcutBindings[conflictingAction.id] = '';
    shortcutBindings[editingShortcutId] = recordedShortcut;
    onUpdateSettings({ shortcutBindings });
    cancelShortcutEdit();
  };

  const resetShortcut = (id: ShortcutId) => {
    const action = getShortcutAction(id);
    const conflictingAction = SHORTCUT_ACTIONS.find(
      (candidate) =>
        candidate.id !== id &&
        settings.shortcutBindings[candidate.id] === action.defaultShortcut
    );
    if (conflictingAction) {
      setEditingShortcutId(id);
      setRecordedShortcut(action.defaultShortcut);
      setShortcutConflict(conflictingAction.id);
      setShortcutWarning(false);
      setAllowEscapeShortcut(false);
      return;
    }
    onUpdateSettings({
      shortcutBindings: {
        ...settings.shortcutBindings,
        [id]: action.defaultShortcut,
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150 max-h-[85vh]">
        {/* Title */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              FlowFiles Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-4 border-b border-slate-800 bg-slate-900 text-xs">
          <button
            onClick={() => setActiveTab('appearance')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'appearance'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Appearance & Theme
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'explorer'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            File Explorer Options
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors ${
              activeTab === 'shortcuts'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Keyboard Shortcuts
          </button>
        </div>

        {/* Tab body */}
        <div className="p-6 space-y-6 text-xs overflow-y-auto max-h-[60vh]">
          {/* TAB 1: Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="font-semibold text-slate-200 block mb-2">
                  Color Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => onUpdateSettings({ theme: 'dark' })}
                    aria-pressed={settings.theme === 'dark'}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      settings.theme === 'dark'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Moon className="w-5 h-5 text-sky-400" />
                    <span>Dark (Default)</span>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ theme: 'light' })}
                    aria-pressed={settings.theme === 'light'}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      settings.theme === 'light'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sun className="w-5 h-5 text-amber-400" />
                    <span>Light Mode</span>
                  </button>
                  <button
                    onClick={() => onUpdateSettings({ theme: 'system' })}
                    aria-pressed={settings.theme === 'system'}
                    className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                      settings.theme === 'system'
                        ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-medium'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Laptop className="w-5 h-5 text-slate-400" />
                    <span>Windows System</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-200 block mb-2">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  {accentOptions.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => onUpdateSettings({ accentColor: acc.id })}
                      aria-pressed={settings.accentColor === acc.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        settings.accentColor === acc.id
                          ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                          : 'border-slate-800 bg-slate-950 text-slate-400'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${acc.color}`} />
                      <span>{acc.name}</span>
                      {settings.accentColor === acc.id && (
                        <Check className="w-3.5 h-3.5 text-sky-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center justify-between cursor-pointer py-1.5">
                  <div>
                    <span className="font-medium text-slate-200 block">Compact Density</span>
                    <span className="text-[11px] text-slate-400">
                      Decrease row heights in details and list views for maximum information density.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactDensity}
                    onChange={(e) => onUpdateSettings({ compactDensity: e.target.checked })}
                    className="accent-sky-500"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: Explorer Options */}
          {activeTab === 'explorer' && (
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-800/80">
                <div>
                  <span className="font-medium text-slate-200 block">Show Hidden Files & Folders</span>
                  <span className="text-[11px] text-slate-400">
                    Display files flagged with the hidden attribute.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showHiddenFiles}
                  onChange={(e) => onUpdateSettings({ showHiddenFiles: e.target.checked })}
                  className="accent-sky-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-800/80">
                <div>
                  <span className="font-medium text-slate-200 block">Show File Extensions</span>
                  <span className="text-[11px] text-slate-400">
                    Always include known extensions in file names (e.g. .docx, .png).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showFileExtensions}
                  onChange={(e) => onUpdateSettings({ showFileExtensions: e.target.checked })}
                  className="accent-sky-500"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer py-2 border-b border-slate-800/80">
                <div>
                  <span className="font-medium text-slate-200 block">Single-Click to Open Items</span>
                  <span className="text-[11px] text-slate-400">
                    Point to select, single-click to open (alternative to standard double-click).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.singleClickOpen}
                  onChange={(e) => onUpdateSettings({ singleClickOpen: e.target.checked })}
                  className="accent-sky-500"
                />
              </label>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                <span className="font-semibold text-slate-300 block mb-1">Safety & Integrity</span>
                {isNative
                  ? 'Native filesystem access is currently read-only. Changes such as creating, renaming, moving or deleting files are not available in the desktop app yet.'
                  : 'Browser preview uses an isolated in-memory filesystem. Its sample changes never modify files on your computer.'}
              </div>
            </div>
          )}

          {/* TAB 3: Shortcuts */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <label className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    value={shortcutQuery}
                    onChange={(event) => setShortcutQuery(event.target.value)}
                    placeholder="Search actions or shortcuts..."
                    aria-label="Search keyboard shortcuts"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-sky-500"
                  />
                </label>
                {!confirmResetAll ? (
                  <button
                    onClick={() => setConfirmResetAll(true)}
                    className="flex items-center gap-1.5 rounded border border-slate-700 px-2.5 py-2 text-[11px] text-slate-300 hover:border-slate-500 hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset all
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-amber-300">Reset every shortcut?</span>
                    <button
                      onClick={() => {
                        onResetAllShortcuts();
                        setConfirmResetAll(false);
                        cancelShortcutEdit();
                      }}
                      className="rounded bg-red-700 px-2 py-1.5 text-white hover:bg-red-600"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmResetAll(false)}
                      className="rounded border border-slate-700 px-2 py-1.5 text-slate-300 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500">
                Some browser and operating-system shortcuts are reserved and may not reach FlowFiles, especially in browser preview. They can still be configured, but may not work in every environment.
              </p>

              {filteredShortcutActions.length === 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-center text-xs text-slate-500">
                  No matching keyboard shortcuts.
                </div>
              )}

              {(['Navigation', 'Tabs and windows', 'File operations', 'Search', 'View and layout', 'Application and settings'] as const).map((category) => {
                const actions = filteredShortcutActions.filter((action) => action.category === category);
                if (actions.length === 0) return null;
                return (
                  <section key={category} className="space-y-2">
                    <h4 className="border-b border-slate-800 pb-1.5 text-xs font-semibold text-slate-300">{category}</h4>
                    <div className="space-y-2">
                      {actions.map((action) => {
                        const binding = settings.shortcutBindings[action.id] || '';
                        const unavailable = !isShortcutAvailable(action.id, isNative);
                        const isEditing = editingShortcutId === action.id;
                        const isResettable = binding !== action.defaultShortcut;
                        return (
                          <div key={action.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-slate-200">{action.name}</span>
                                  {unavailable && (
                                    <span className="rounded bg-amber-950/70 px-1.5 py-0.5 text-[10px] text-amber-300">
                                      Unavailable in desktop build
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 text-[11px] text-slate-500">{action.description}</p>
                                {unavailable && (
                                  <p className="mt-1 text-[10px] text-amber-400/80">
                                    Native filesystem operations are read-only; this action works only in browser preview.
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <kbd className="min-w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-center font-mono text-[10px] text-slate-300">
                                  {unavailable ? 'Unavailable' : binding || 'Not set'}
                                </kbd>
                                <button
                                  onClick={() => beginShortcutEdit(action.id)}
                                  disabled={unavailable}
                                  className="rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => resetShortcut(action.id)}
                                  disabled={unavailable || !isResettable}
                                  title="Reset this shortcut to its default"
                                  className="rounded border border-slate-700 p-1 text-slate-400 hover:border-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <RotateCw className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {isEditing && (
                              <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                                <label className="block text-[11px] font-medium text-slate-300">Press new shortcut</label>
                                <input
                                  id="shortcut-recorder"
                                  data-shortcut-recorder="true"
                                  autoFocus
                                  readOnly
                                  value={recordedShortcut || 'Press new shortcut'}
                                  onKeyDown={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (event.key === 'Escape' && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey && !allowEscapeShortcut) {
                                      cancelShortcutEdit();
                                      return;
                                    }
                                    if (['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) {
                                      const modifiers = [
                                        event.ctrlKey || event.metaKey ? 'Ctrl' : null,
                                        event.altKey ? 'Alt' : null,
                                        event.shiftKey ? 'Shift' : null,
                                      ].filter(Boolean);
                                      setRecordedShortcut(modifiers.length ? `${modifiers.join('+')}+Press a key` : null);
                                      return;
                                    }
                                    const shortcut = shortcutFromKeyboardEvent(event.nativeEvent);
                                    if (shortcut) {
                                      setRecordedShortcut(shortcut);
                                      setShortcutConflict(null);
                                      setShortcutWarning(false);
                                    }
                                  }}
                                  aria-label="Press new shortcut"
                                  className="w-full rounded border border-sky-600 bg-slate-900 px-3 py-2 text-center font-mono text-xs text-sky-200 outline-none"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <button
                                    onClick={() => {
                                      setAllowEscapeShortcut((current) => !current);
                                      document.getElementById('shortcut-recorder')?.focus();
                                    }}
                                    className={`text-left text-[10px] ${allowEscapeShortcut ? 'text-sky-300' : 'text-slate-500 hover:text-slate-300'}`}
                                  >
                                    {allowEscapeShortcut ? '✓ ' : ''}Allow Escape as a shortcut (otherwise Escape cancels)
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <button onClick={cancelShortcutEdit} className="rounded border border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-300 hover:text-white">Cancel</button>
                                    <button
                                      onClick={() => saveShortcut()}
                                      disabled={!recordedShortcut || recordedShortcut.includes('Press a key')}
                                      className="rounded bg-sky-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                                {shortcutConflict && (
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-700/60 bg-amber-950/30 p-2 text-[10px] text-amber-200">
                                    <span><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{recordedShortcut} is assigned to {getShortcutAction(shortcutConflict).name}.</span>
                                    <div className="flex gap-2">
                                      <button onClick={cancelShortcutEdit} className="rounded border border-slate-700 px-2 py-1 text-slate-300">Cancel</button>
                                      <button onClick={() => saveShortcut(true)} className="rounded bg-amber-700 px-2 py-1 text-white hover:bg-amber-600">Reassign shortcut</button>
                                    </div>
                                  </div>
                                )}
                                {shortcutWarning && (
                                  <div className="flex items-start gap-2 rounded border border-amber-700/60 bg-amber-950/30 p-2 text-[10px] leading-relaxed text-amber-200">
                                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>This combination may be reserved by the browser or operating system. Confirm the action again to keep it anyway.</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            FlowFiles v1.0.0-rc1 &middot; Open Source
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
