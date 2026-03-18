import { Moon, Sun, MoonStar } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const LABELS: Record<string, string> = {
  light: 'Tema claro — clique para escuro',
  dark: 'Tema escuro — clique para full dark',
  'full-dark': 'Tema full dark — clique para claro',
};

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={className || 'relative h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground'}
            aria-label={LABELS[theme] ?? 'Alternar tema'}
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
              animate={{ scale: theme === 'full-dark' ? 1 : 0, opacity: theme === 'full-dark' ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="absolute"
            >
              <MoonStar className="w-5 h-5" />
            </motion.div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {LABELS[theme] ?? 'Alternar tema'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
