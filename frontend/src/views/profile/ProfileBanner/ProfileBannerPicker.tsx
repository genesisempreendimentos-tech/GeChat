import { useState, type ComponentType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BANNER_CATEGORIES, BANNER_ORDER } from './ProfileBannerImages';
import {
  Home,
  Building2,
  Map,
  Palette,
  Sparkles,
  Gamepad2,
  LucideIcon,
} from 'lucide-react';

function SatelliteIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5" />
      <path d="M16.5 7.5 19 5" />
      <path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5" />
      <path d="M9 21a6 6 0 0 0-6-6" />
      <path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z" />
    </svg>
  );
}

function SoccerPitchIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v5" />
      <path d="M12 14v5" />
      <circle cx="12" cy="12" r="2" />
      <path d="M2 9h4v6H2" />
      <path d="M3 19c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1h18c.6 0 1 .4 1 1v12c0 .6-.4 1-1 1Z" />
      <path d="M22 15h-4V9h4" />
    </svg>
  );
}

type IconComponent = LucideIcon | ComponentType<{ className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  Home,
  Telescope: SatelliteIcon,
  Building2,
  Map,
  Palette,
  Shapes: Sparkles,
  Gamepad2,
  Trophy: SoccerPitchIcon,
};

interface ProfileBannerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectImage: (url: string) => void;
  currentUrl?: string;
}

export function ProfileBannerPicker({
  open,
  onOpenChange,
  onSelectImage,
  currentUrl,
}: ProfileBannerPickerProps) {
  const [activeCategory, setActiveCategory] = useState(BANNER_ORDER[0] ?? 'demo');

  const category = BANNER_CATEGORIES[activeCategory];

  const handleSelect = (url: string) => {
    onSelectImage(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1520]">
        <DialogTitle className="sr-only">Escolha uma imagem de capa</DialogTitle>
        <DialogDescription className="sr-only">Selecione uma imagem de capa para o seu perfil</DialogDescription>

        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Escolha uma imagem de capa</h2>
        </div>

        {/* Tabs de categorias com animação */}
        <div className="px-5 py-3 border-b border-white/8">
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-none">
              {BANNER_ORDER.map((key) => {
                const cat = BANNER_CATEGORIES[key];
                if (!cat) return null;
                const Icon = ICON_MAP[cat.icon] ?? Home;
                const isActive = key === activeCategory;
                return (
                  <Tooltip key={key}>
                    <TooltipTrigger asChild>
                      <motion.button
                        type="button"
                        onClick={() => setActiveCategory(key)}
                        layout
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={cn(
                          'relative flex items-center gap-1.5 py-1.5 rounded-full text-sm font-medium shrink-0 outline-none',
                          'transition-colors duration-200',
                          isActive
                            ? 'px-3.5 text-white'
                            : 'px-2.5 text-white/50 hover:text-white/80'
                        )}
                      >
                        {/* Pill de fundo animado */}
                        {isActive && (
                          <motion.span
                            layoutId="banner-tab-pill"
                            className="absolute inset-0 rounded-full bg-teal-500 shadow-sm shadow-teal-500/40"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <AnimatePresence mode="wait">
                            {isActive && (
                              <motion.span
                                key={key}
                                initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                                animate={{ opacity: 1, width: 'auto', marginLeft: 0 }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden whitespace-nowrap"
                              >
                                {cat.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-[#0d1520] border-white/10 text-white">
                      <p>{cat.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>

        {/* Grid de imagens — aspect-ratio mais horizontal para parecer banner */}
        <div className="px-4 py-4 overflow-y-auto" style={{ maxHeight: 'min(380px, 55vh)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-2 gap-2.5"
            >
              {category?.images.map((url, i) => {
                const isSelected = url === currentUrl;
                return (
                  <motion.button
                    key={url}
                    type="button"
                    onClick={() => handleSelect(url)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.15 }}
                    className={cn(
                      'relative rounded-xl overflow-hidden transition-all duration-200 outline-none group',
                      'focus-visible:ring-2 focus-visible:ring-teal-400',
                      isSelected
                        ? 'ring-2 ring-teal-400 ring-offset-2 ring-offset-[#0d1520]'
                        : 'hover:ring-2 hover:ring-white/25 hover:ring-offset-1 hover:ring-offset-[#0d1520]'
                    )}
                    style={{ aspectRatio: '16 / 5' }}
                  >
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Overlay hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
                    {/* Checkmark se selecionado */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-teal-400/15 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-teal-400 shadow-lg flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
