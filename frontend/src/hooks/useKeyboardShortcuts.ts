import { useEffect } from 'react';

interface KeyboardShortcutsProps {
  onNext: () => void;
  onPrevious: () => void;
  onArchive: () => void;
  onSearch: () => void;
  onSelect: () => void;
  onDelete: () => void;
}

export function useKeyboardShortcuts({
  onNext,
  onPrevious,
  onArchive,
  onSearch,
  onSelect,
  onDelete,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.isContentEditable
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
          onNext();
          break;
        case 'k':
          onPrevious();
          break;
        case 'a':
          onArchive();
          break;
        case '/':
          e.preventDefault();
          onSearch();
          break;
        case 'x':
          onSelect();
          break;
        case 'delete':
        case 'backspace':
          if (e.metaKey || e.ctrlKey) {
             onDelete();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious, onArchive, onSearch, onSelect, onDelete]);
}
