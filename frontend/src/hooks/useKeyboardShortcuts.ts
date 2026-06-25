import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { vitrinePath } from '@/lib/panels';

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
  ...Array.from({ length: 6 }, (_, i) => ({
    key: String(i + 1),
    altKey: true,
    action: () => navigate(vitrinePath(`/item-${i + 1}`)),
    description: `Ir para Item ${i + 1}`,
  })),
  {
    key: ',',
    altKey: true,
    action: () => navigate(vitrinePath('/settings')),
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
• Alt+1 a Alt+6 - Itens da Vitrine
• Alt+, - Configurações
• Shift+? - Mostrar atalhos`;

    toast.info(help, {
      duration: 8000,
    });
  };

  return { showShortcutsHelp };
}
