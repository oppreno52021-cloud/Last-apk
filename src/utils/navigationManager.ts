import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export interface ModalEntry {
  id: string;
  onBack: () => void;
}

class NavigationManager {
  private modalStack: ModalEntry[] = [];
  private currentTab: string = 'home';
  private onSwitchTab?: (tab: 'home' | 'transactions' | 'insights' | 'settings') => void;
  private onShowExitToast?: () => void;
  private lastBackPressTime: number = 0;
  private isLocked: boolean = false;
  private isInitialized: boolean = false;

  public init(
    initialTab: string,
    onSwitchTab: (tab: any) => void,
    onShowExitToast: () => void
  ) {
    this.currentTab = initialTab;
    this.onSwitchTab = onSwitchTab;
    this.onShowExitToast = onShowExitToast;

    if (this.isInitialized) return;
    this.isInitialized = true;

    // Handle Capacitor Hardware Back Button (Android)
    try {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.addListener('backButton', () => {
          this.handleBackPress(true);
        });
      }
    } catch {
      // ignore
    }

    // Handle Web/Browser PopState (History Back)
    if (typeof window !== 'undefined') {
      window.addEventListener('popstate', () => {
        const handled = this.handleBackPress(false);
        if (handled) {
          try {
            window.history.pushState({ app: 'masrofy' }, '');
          } catch {
            // ignore
          }
        }
      });

      try {
        if (!window.history.state) {
          window.history.replaceState({ app: 'masrofy' }, '');
        }
      } catch {
        // ignore
      }
    }
  }

  public setTab(tab: string) {
    this.currentTab = tab;
  }

  public setLocked(locked: boolean) {
    this.isLocked = locked;
  }

  public pushModal(id: string, onBack: () => void) {
    this.removeModal(id);
    this.modalStack.push({ id, onBack });
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ modal: id }, '');
      } catch {
        // ignore
      }
    }
  }

  public removeModal(id: string) {
    this.modalStack = this.modalStack.filter(m => m.id !== id);
  }

  public handleBackPress(_isNative: boolean = false): boolean {
    if (this.isLocked) {
      // If locked, back press immediately exits the app
      try {
        if (Capacitor.isNativePlatform()) {
          CapacitorApp.exitApp();
        }
      } catch {
        // ignore
      }
      return false;
    }

    // 1. If modals/sheets are open, close top-most one
    if (this.modalStack.length > 0) {
      const topModal = this.modalStack.pop();
      if (topModal) {
        topModal.onBack();
        return true;
      }
    }

    // 2. If on sub-tab, return to home tab
    if (this.currentTab !== 'home') {
      if (this.onSwitchTab) {
        this.onSwitchTab('home');
        return true;
      }
    }

    // 3. On home tab: Single press to exit immediately
    try {
      if (Capacitor.isNativePlatform()) {
        CapacitorApp.exitApp();
      }
    } catch {
      // ignore
    }
    return false;
  }
}

export const navigationManager = new NavigationManager();
