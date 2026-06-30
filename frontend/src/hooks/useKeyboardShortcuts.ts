import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: ',',
      altKey: true,
      action: () => navigate('/settings'),
      description: 'Ir para Configurações',
    },
  ];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInputField =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true';

      if (isInputField) return;

      const eventKey = String(event.key ?? '').toLowerCase();
      const shortcut = shortcuts.find(
        (s) =>
          String(s.key ?? '').toLowerCase() === eventKey &&
          s.ctrlKey === event.ctrlKey &&
          s.shiftKey === event.shiftKey &&
          s.altKey === event.altKey &&
          (s.metaKey === undefined || s.metaKey === event.metaKey),
      );

      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }

      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        showShortcutsHelp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const showShortcutsHelp = () => {
    const help = `Atalhos de Teclado:
• Ctrl+K - Busca global
• Alt+, - Configurações
• Shift+? - Mostrar atalhos`;

    toast.info(help, { duration: 8000 });
  };

  return { showShortcutsHelp };
}
