import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <div className="fixed bottom-9 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto p-3 rounded-lg bg-slate-900/95 border border-slate-750 shadow-xl flex items-start gap-2.5 text-xs text-slate-200 animate-in slide-in-from-bottom-2 fade-in duration-150 backdrop-blur-md"
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          )}

          <div className="flex-1 min-w-0">
            {toast.title && (
              <div className="font-semibold text-slate-100 mb-0.5 truncate">
                {toast.title}
              </div>
            )}
            <div className="text-slate-300 break-words leading-relaxed text-[11px]">
              {toast.message}
            </div>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
