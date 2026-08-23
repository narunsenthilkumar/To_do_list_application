import { useEffect } from 'react';
import { Platform } from 'react-native';

export interface ShortcutHandlers {
  onQuickAdd?: () => void;
  onCommandPalette?: () => void;
  onSearch?: () => void;
  onNavigate?: (view: string) => void;
  onClose?: () => void;
  onToggleComplete?: () => void;
  onDeleteSelected?: () => void;
  onSettings?: () => void;
}

export function useDesktopShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable;

      // Handle Escape even if focused in input (blur or close)
      if (e.key === 'Escape') {
        if (isInput) {
          (document.activeElement as HTMLElement)?.blur();
        }
        handlers.onClose?.();
        return;
      }

      // If user is currently typing in an input/textarea, do not intercept regular keys or Ctrl shortcuts that aren't global
      if (isInput) {
        return;
      }

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      if (isCtrlOrMeta) {
        const key = e.key.toLowerCase();
        if (key === 'n') {
          e.preventDefault();
          handlers.onQuickAdd?.();
        } else if (key === 'k') {
          e.preventDefault();
          handlers.onCommandPalette?.();
        } else if (key === 'f') {
          e.preventDefault();
          handlers.onSearch?.();
        } else if (key === ',') {
          e.preventDefault();
          handlers.onSettings?.();
        } else if (key === '1') {
          e.preventDefault();
          handlers.onNavigate?.('today');
        } else if (key === '2') {
          e.preventDefault();
          handlers.onNavigate?.('inbox');
        } else if (key === '3') {
          e.preventDefault();
          handlers.onNavigate?.('projects');
        } else if (key === '4') {
          e.preventDefault();
          handlers.onNavigate?.('calendar');
        } else if (key === '5') {
          e.preventDefault();
          handlers.onNavigate?.('focus');
        }
      } else {
        if (e.key === ' ' || e.code === 'Space') {
          // Only trigger if no active modal/dialog open
          handlers.onToggleComplete?.();
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          handlers.onDeleteSelected?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
