import { useState, useMemo, useEffect, useRef } from 'react';
import { getAllBannerImages } from './ProfileBannerImages';
import { ProfileRandomImages } from './ProfileRandomImages';
import { ProfileBannerPicker } from './ProfileBannerPicker';
import { Button } from '@/components/ui/button';
import { LayoutGrid } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { databaseService } from '@/services/supabase';

const DEFAULT_BANNER = '/assets/banners/demo/1.jpg';
const LS_KEY = (userId?: string | null) =>
  userId ? `profile_banner_${userId}` : 'profile_banner_guest';

interface ProfileBannerProps {
  userId?: string | null;
  /** Banner controlado pelo pai (ex.: ProfileView) para o popup do card atualizar junto */
  value?: string;
  /** Chamado quando o usuário troca o banner (random/picker); o pai pode atualizar seu state */
  onBannerChange?: (url: string) => void;
}

export function ProfileBanner({ userId, value, onBannerChange }: ProfileBannerProps) {
  const allImages = useMemo(() => getAllBannerImages(), []);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localBannerUrl, setLocalBannerUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(LS_KEY(userId));
      if (saved) return saved;
    } catch { /* ignorar */ }
    if (allImages.length > 0) {
      return allImages[Math.floor(Math.random() * allImages.length)] ?? DEFAULT_BANNER;
    }
    return DEFAULT_BANNER;
  });

  const [pickerOpen, setPickerOpen] = useState(false);

  const displayUrl = (value !== undefined && value !== '') ? value : localBannerUrl;

  // Sincroniza estado local quando o pai envia valor (ex.: após carregar do Supabase)
  useEffect(() => {
    if (value !== undefined && value !== '') {
      setLocalBannerUrl(value);
    }
  }, [value]);

  // Ao montar ou trocar userId: busca banner salvo no Supabase (só se não estiver controlado pelo pai)
  useEffect(() => {
    if (!userId || (value !== undefined && value !== '')) return;
    databaseService.getUserById(userId).then(({ data }) => {
      const remote = (data as any)?.banner_url;
      if (remote) {
        setLocalBannerUrl(remote);
        onBannerChange?.(remote);
        try { localStorage.setItem(LS_KEY(userId), remote); } catch { /* ignorar */ }
      } else {
        try {
          const local = localStorage.getItem(LS_KEY(userId));
          if (local) setLocalBannerUrl(local);
        } catch { /* ignorar */ }
      }
    });
  }, [userId, value, onBannerChange]);

  const persist = (url: string) => {
    // 1. Atualiza localStorage imediatamente
    try { localStorage.setItem(LS_KEY(userId), url); } catch { /* ignorar */ }

    // 2. Debounce para salvar no Supabase (evita chamadas em excesso ao arrastar)
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (!userId) return;
      databaseService.updateUser(userId, { banner_url: url }).catch(() => {
        // Silencia erro — localStorage já garante persistência local
      });
    }, 800);
  };

  const handleSelectImage = (url: string) => {
    setLocalBannerUrl(url);
    persist(url);
    onBannerChange?.(url);
  };

  return (
    <>
      <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-muted">
        <img
          key={displayUrl}
          src={displayUrl}
          alt="Banner do perfil"
          className="w-full h-full object-cover animate-in fade-in duration-500"
        />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <ProfileRandomImages onSelectImage={handleSelectImage} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setPickerOpen(true)}
                  className={cn(
                    'h-9 w-9 rounded-full border-2 transition-all duration-200',
                    'border-slate-100 dark:border-slate-800',
                    'bg-slate-100/90 dark:bg-slate-800',
                    'hover:bg-slate-300 dark:hover:bg-slate-700',
                  )}
                  aria-label="Escolha uma imagem de capa"
                >
                  <LayoutGrid className="w-4 h-4 text-slate-700 dark:text-slate-200" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Escolha uma imagem de capa</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <ProfileBannerPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelectImage={handleSelectImage}
        currentUrl={displayUrl}
      />
    </>
  );
}
