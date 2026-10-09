import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export const DemoBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-xs text-amber-200 select-none z-20 shrink-0">
      <div className="flex items-center gap-2 overflow-hidden">
        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="truncate">
          <strong className="font-semibold text-amber-300">Browser Demo — sample files only.</strong>{' '}
          These files exist only in your browser memory for testing FlowFiles UI & workflows. No real files on your computer are read or modified.
        </span>
      </div>

      <button
        onClick={() => setIsDismissed(true)}
        className="p-0.5 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-200 ml-2 shrink-0"
        title="Dismiss banner"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
