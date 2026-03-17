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

const DEFAULT_BANNER = '/assets/banners/genesis/1.jpg';
const LS_KEY = (userId?: string | null) =>
  userId ? `profile_banner_${userId}` : 'profile_banner_guest';

interface ProfileBannerProps {
  userId?: string | null;
}

export function ProfileBanner({ userId }: ProfileBannerProps) {
  const allImages = useMemo(() => getAllBannerImages(), []);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bannerUrl, setBannerUrl] = useState<string>(() => {
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

  // Ao montar ou trocar userId: busca banner salvo no Supabase
  useEffect(() => {
    if (!userId) return;
    databaseService.getUserById(userId).then(({ data }) => {
      const remote = (data as any)?.banner_url;
      if (remote) {
        setBannerUrl(remote);
        try { localStorage.setItem(LS_KEY(userId), remote); } catch { /* ignorar */ }
      } else {
        // Sem dado remoto — aplica o que está no localStorage
        try {
          const local = localStorage.getItem(LS_KEY(userId));
          if (local) setBannerUrl(local);
        } catch { /* ignorar */ }
      }
    });
  }, [userId]);

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
    setBannerUrl(url);
    persist(url);
  };

  return (
    <>
      <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-muted">
        <img
          key={bannerUrl}
          src={bannerUrl}
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
        currentUrl={bannerUrl}
      />
    </>
  );
}
