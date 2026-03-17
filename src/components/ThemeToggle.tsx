import { Moon, Sun, CircleDot } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className={className || "relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"}
      aria-label={`Tema: ${theme === 'light' ? 'claro' : theme === 'dark' ? 'escuro' : 'off-white'}. Clique para alternar.`}
    >
      <motion.div
        initial={false}
        animate={{ scale: theme === 'light' ? 1 : 0, opacity: theme === 'light' ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Sun className="w-5 h-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ scale: theme === 'dark' ? 1 : 0, opacity: theme === 'dark' ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <Moon className="w-5 h-5" />
      </motion.div>
      <motion.div
        initial={false}
        animate={{ scale: theme === 'offwhite' ? 1 : 0, opacity: theme === 'offwhite' ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="absolute"
      >
        <CircleDot className="w-5 h-5" />
      </motion.div>
    </Button>
  );
}
