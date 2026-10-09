import { useEffect, useRef } from 'react';
import { navigationManager } from '../utils/navigationManager';

/**
 * Custom hook to register a back action for modals, bottom sheets, drawers, and menus.
 * Powered by unified NavigationManager to guarantee safe modal stack popping without
 * unwanted page switches.
 */
export function useBackHandler(isOpen: boolean, onBack: () => void, id: string = 'modal') {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isOpen) return;

    const modalKey = `${id}-${Date.now()}`;
    navigationManager.pushModal(modalKey, () => {
      onBackRef.current();
    });

    return () => {
      navigationManager.removeModal(modalKey);
    };
  }, [isOpen, id]);
}
