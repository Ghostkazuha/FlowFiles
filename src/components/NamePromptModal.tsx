import React, { useState, useEffect, useRef } from 'react';
import { X, FolderPlus, Edit2, AlertCircle, Check } from 'lucide-react';
import { validateFileName } from '../utils/fileUtils';

export interface NamePromptState {
  isOpen: boolean;
  mode: 'create_folder' | 'rename';
  title: string;
  initialValue: string;
  existingNames: string[];
  onSubmit: (newName: string) => Promise<void> | void;
}

interface NamePromptModalProps {
  promptState: NamePromptState | null;
  onClose: () => void;
}

export const NamePromptModal: React.FC<NamePromptModalProps> = ({
  promptState,
  onClose,
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (promptState && promptState.isOpen) {
      setValue(promptState.initialValue);
      setError(null);
      setIsSubmitting(false);

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // Select base name without extension for files
          const dotIdx = promptState.initialValue.lastIndexOf('.');
          if (promptState.mode === 'rename' && dotIdx > 0) {
            inputRef.current.setSelectionRange(0, dotIdx);
          } else {
            inputRef.current.select();
          }
        }
      }, 30);
    }
  }, [promptState]);

  if (!promptState || !promptState.isOpen) return null;

  const validate = (val: string): boolean => {
    const trimmed = val.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return false;
    }

    const check = validateFileName(trimmed);
    if (!check.valid) {
      setError(check.error || 'Invalid name.');
      return false;
    }

    // Collision check
    const isSameAsInitial = promptState.mode === 'rename' && trimmed.toLowerCase() === promptState.initialValue.toLowerCase();
    if (!isSameAsInitial) {
      const exists = promptState.existingNames.some(
        (n) => n.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) {
        setError(`An item named "${trimmed}" already exists in this folder.`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setValue(nextVal);
    validate(nextVal);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate(value)) return;

    try {
      setIsSubmitting(true);
      await promptState.onSubmit(value.trim());
      setIsSubmitting(false);
      onClose();
    } catch (err: unknown) {
      setIsSubmitting(false);
      setError(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const isCreate = promptState.mode === 'create_folder';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-md bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/70 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            {isCreate ? (
              <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <FolderPlus className="w-4 h-4" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center">
                <Edit2 className="w-4 h-4" />
              </div>
            )}
            <h3 className="text-sm font-semibold text-slate-100">
              {promptState.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">
              {isCreate ? 'Folder name:' : 'New name:'}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={value}
              onChange={handleChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
              className={`w-full bg-slate-950 text-slate-100 px-3 py-2 rounded-lg border text-xs outline-none transition-all ${
                error
                  ? 'border-rose-500 ring-1 ring-rose-500/30'
                  : 'border-slate-750 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30'
              }`}
              placeholder={isCreate ? 'e.g. New Folder' : 'Enter new name'}
            />

            {/* Validation error message */}
            {error && (
              <div className="flex items-start gap-1.5 mt-2 text-rose-400 text-[11px] leading-snug">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-md border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
            Names cannot contain: <code className="font-mono text-slate-300">\ / : * ? &quot; &lt; &gt; |</code> or Windows reserved device names.
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(error) || isSubmitting}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-medium rounded-md flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isCreate ? 'Create Folder' : 'Rename'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
