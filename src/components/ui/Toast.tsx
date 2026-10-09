import React from 'react';
import { useApp } from '../../context/AppContext';
import { RotateCcw } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, dismissToast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 inset-x-0 z-[70] flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="relative overflow-hidden pointer-events-auto max-w-sm w-full bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 border border-slate-200/90 dark:border-slate-800 flex items-center justify-between gap-3 text-xs sm:text-sm">
        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
          {toast.message}
        </span>
        <div className="flex items-center shrink-0">
          {toast.actionLabel && toast.onAction && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  try {
                    navigator.vibrate(10);
                  } catch (_) {}
                }
                toast.onAction?.();
                dismissToast();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 dark:bg-blue-950/80 dark:hover:bg-blue-900/80 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-1.5 transition-all border border-blue-200/90 dark:border-blue-800/80 cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCcw size={13} className="text-blue-600 dark:text-blue-400" />
              <span>{toast.actionLabel}</span>
            </button>
          )}
        </div>

        {/* 3-second delicate progress bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-500/15 dark:bg-blue-400/15 overflow-hidden">
          <div 
            className="h-full bg-blue-500 dark:bg-blue-400 w-full"
            style={{
              animation: 'toast-shrink 3000ms linear forwards'
            }}
          />
        </div>
      </div>
    </div>
  );
};
