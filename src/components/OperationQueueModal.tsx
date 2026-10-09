import React from 'react';
import {
  X,
  Play,
  Pause,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Scissors,
  Trash2,
  Check,
} from 'lucide-react';
import { OperationProgress } from '../types/filesystem';

interface OperationQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  operations: OperationProgress[];
  onCancelOperation: (id: string) => void;
  onTogglePauseOperation: (id: string) => void;
  onClearCompleted: () => void;
}

export const OperationQueueModal: React.FC<OperationQueueModalProps> = ({
  isOpen,
  onClose,
  operations,
  onCancelOperation,
  onTogglePauseOperation,
  onClearCompleted,
}) => {
  if (!isOpen) return null;

  const activeOps = operations.filter((o) => o.status === 'running' || o.status === 'paused');
  const completedOps = operations.filter((o) => o.status === 'completed' || o.status === 'cancelled' || o.status === 'error');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
            <h3 className="text-sm font-semibold text-slate-100">
              Operations Queue ({operations.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List of operations */}
        <div className="p-4 max-h-96 overflow-y-auto space-y-3 text-xs">
          {operations.length === 0 ? (
            <div className="p-8 text-center text-slate-500 italic">
              No active or pending operations in queue.
            </div>
          ) : (
            operations.map((op) => {
              const isRunning = op.status === 'running';
              const isPaused = op.status === 'paused';
              const isCompleted = op.status === 'completed';
              const isError = op.status === 'error';

              return (
                <div
                  key={op.id}
                  className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      {op.type === 'copy' && <Copy className="w-4 h-4 text-sky-400 shrink-0" />}
                      {op.type === 'move' && <Scissors className="w-4 h-4 text-amber-400 shrink-0" />}
                      {op.type === 'delete' && <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />}
                      <span className="font-semibold text-slate-200 truncate">
                        {op.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(isRunning || isPaused) && (
                        <>
                          <button
                            onClick={() => onTogglePauseOperation(op.id)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
                            title={isPaused ? 'Resume' : 'Pause'}
                          >
                            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => onCancelOperation(op.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300"
                            title="Cancel"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {isCompleted && (
                        <div className="flex items-center gap-1 text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Done</span>
                        </div>
                      )}
                      {isError && (
                        <div className="flex items-center gap-1 text-rose-400 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          <span>Failed</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isError
                          ? 'bg-rose-500'
                          : isPaused
                          ? 'bg-amber-500'
                          : 'bg-sky-500'
                      }`}
                      style={{ width: `${op.percent}%` }}
                    />
                  </div>

                  {/* Metadata and speed */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-[240px]">
                      {isRunning ? `Processing: ${op.currentItem}` : op.status}
                    </span>
                    <div className="flex items-center gap-2 font-mono tabular-nums">
                      {op.speed && <span>{op.speed}</span>}
                      <span>{op.percent}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={onClearCompleted}
            disabled={completedOps.length === 0}
            className="text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:hover:text-slate-400 transition-colors"
          >
            Clear completed
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
