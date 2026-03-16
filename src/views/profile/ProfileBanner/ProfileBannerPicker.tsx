import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { BANNER_CATEGORIES, BANNER_ORDER } from './ProfileBannerImages';
import {
  Home,
  Star,
  Building2,
  Map,
  Palette,
  Sparkles,
  Gamepad2,
  Trophy,
  LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Telescope: Star,
  Building2,
  Map,
  Palette,
  Shapes: Sparkles,
  Gamepad2,
  Trophy,
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
  const [activeCategory, setActiveCategory] = useState(BANNER_ORDER[0] ?? 'genesis');

  const category = BANNER_CATEGORIES[activeCategory];

  const handleSelect = (url: string) => {
    onSelectImage(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1520]">
        <DialogTitle className="sr-only">Escolha uma imagem de capa</DialogTitle>

        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-white/8">
          <h2 className="text-base font-semibold text-white">Escolha uma imagem de capa</h2>
        </div>

        {/* Tabs de categorias com animação */}
        <div className="px-5 py-3 border-b border-white/8">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {BANNER_ORDER.map((key) => {
              const cat = BANNER_CATEGORIES[key];
              if (!cat) return null;
              const Icon = ICON_MAP[cat.icon] ?? Home;
              const isActive = key === activeCategory;
              return (
                <motion.button
                  key={key}
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
              );
            })}
          </div>
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
