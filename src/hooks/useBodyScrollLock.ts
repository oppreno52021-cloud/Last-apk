import { useEffect } from 'react';

/**
 * Reference-counted body scroll lock to prevent scroll freezing
 * when multiple or nested modals open/close.
 */
let activeLocks = 0;

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    activeLocks++;
    if (activeLocks === 1) {
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'contain';
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'contain';
    }

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);
      if (activeLocks === 0) {
        document.body.style.overflow = '';
        document.body.style.overscrollBehavior = '';
        document.documentElement.style.overflow = '';
        document.documentElement.style.overscrollBehavior = '';
      }
    };
  }, [isLocked]);
}
