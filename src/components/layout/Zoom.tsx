import { useState, useRef, useEffect } from 'react';
import { ZoomOut, ZoomIn, RotateCcw, Search } from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/services/supabase';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ViewButtonNavbar from '@/components/ui/ViewButtonNavbar';

const Zoom = () => {
  const { theme } = useThemeStore();
  const { user } = useAuthStore();
  const themeMode = theme === 'dark' ? 'dark' : 'white';

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ── Conversão front ↔ back ──────────────────────────────────────
  // front 100% = back 100%  (sem offset)
  const frontToBack = (f: number) => Math.max(50, Math.min(200, f));
  const backToFront = (b: number) => Math.max(50, Math.min(200, b));

  // Estado armazena o valor FRONT (o que o usuário vê)
  const [zoomLevelFront, setZoomLevelFront] = useState(100);
  const [popupPosition, setPopupPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Carregar zoom salvo ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      let front = 100;
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('users') // Nota: Pode precisar verificar se a tabela é 'users' ou 'profiles'
            .select('zoom')
            .eq('id', user.id)
            .maybeSingle();
            
          if (!error && data?.zoom) {
            front = data.zoom;
          } else {
            const saved = localStorage.getItem('pageZoom');
            if (saved) front = Math.round(backToFront(parseFloat(saved)));
          }
        } catch {
          const saved = localStorage.getItem('pageZoom');
          if (saved) front = Math.round(backToFront(parseFloat(saved)));
        }
      } else {
        const saved = localStorage.getItem('pageZoom');
        if (saved) front = Math.round(backToFront(parseFloat(saved)));
      }
      setZoomLevelFront(front);
    };
    load();
  }, [user?.id]);

  // ── Aplicar zoom no #root ───────────────────────────────────────
  const zoomLevelBack = frontToBack(zoomLevelFront);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const v = zoomLevelBack / 100;
    root.style.setProperty('--app-zoom', v.toString());
    root.style.zoom = v.toString();
    // Limpar zoom residual de body/html
    document.body.style.zoom = '';
    document.body.style.transform = '';
    document.documentElement.style.zoom = '';
    // Persistência local imediata
    localStorage.setItem('pageZoom', zoomLevelBack.toString());
  }, [zoomLevelBack]);

  // ── Salvar no Supabase (debounce 500ms) ────────────────────────
  useEffect(() => {
    const save = async () => {
      if (!user?.id || isLoading) return;
      try {
        setIsLoading(true);
        // Tenta atualizar em profiles se houver erro em users, pois a modelagem parece usar profiles
        let error = null;
        try {
          const res = await supabase.from('users').update({ zoom: zoomLevelFront }).eq('id', user.id);
          error = res.error;
        } catch (e) {}

        if (error) {
          await supabase.from('profiles').update({ zoom: zoomLevelFront }).eq('user_id', user.id);
        }
      } catch (e) {
        console.error('Erro ao salvar zoom:', e);
      } finally {
        setIsLoading(false);
      }
    };
    const t = setTimeout(save, 500);
    return () => clearTimeout(t);
  }, [zoomLevelFront, user?.id]);

  // ── Posição do popup (fixed, abaixo do botão) ──────────────────
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isOpen]);

  // ── Fechar ao clicar fora ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // ── Classes de tema ────────────────────────────────────────────
  const tc = themeMode === 'dark'
    ? { dropdown: 'bg-card border-border text-card-foreground', action: 'bg-accent hover:bg-accent/80 text-accent-foreground' }
    : { dropdown: 'bg-card border-border text-card-foreground', action: 'bg-accent hover:bg-accent/80 text-accent-foreground' };

  // ── Handlers ──────────────────────────────────────────────────
  const clamp = (v: number) => Math.round(Math.max(50, Math.min(200, v)));
  const handleChange = (v: number) => setZoomLevelFront(clamp(v));
  const handleIn = () => handleChange(zoomLevelFront + 10);
  const handleOut = () => handleChange(zoomLevelFront - 10);
  const handleReset = () => setZoomLevelFront(100);

  // Mapeamento slider (0-100) ↔ zoomFront (50-200) não-linear
  const sliderToFront = (s: number) => s <= 50
    ? 50 + (s / 50) * 50
    : 100 + ((s - 50) / 50) * 100;

  const frontToSlider = (z: number) => z <= 100
    ? ((z - 50) / 50) * 50
    : 50 + ((z - 100) / 100) * 50;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Math.round(sliderToFront(parseFloat(e.target.value)));
    if (v >= 50 && v <= 200) setZoomLevelFront(v);
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <div ref={buttonRef}>
            <ViewButtonNavbar
              Icon={Search}
              onClick={() => setIsOpen(o => !o)}
              active={isOpen}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent sideOffset={2}>
          <p>Zoom: {Math.round(zoomLevelFront)}%</p>
        </TooltipContent>
      </Tooltip>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`fixed rounded-xl border shadow-lg z-50 ${tc.dropdown}`}
          style={{
            width: 256,
            height: 160,
            overflow: 'hidden',
            zoom: `${100 / zoomLevelBack}`,       // ← auto-corrige o zoom do popup
            top: `${popupPosition.top}px`,
            right: `${popupPosition.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full flex flex-col justify-between">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="text-sm font-semibold">Zoom</h3>
              <span className="text-sm font-bold text-primary">{Math.round(zoomLevelFront)}%</span>
            </div>

            {/* Slider */}
            <div className="px-4 py-2 flex-1 flex items-center">
              <div className="w-full space-y-2">
                <input
                  type="range"
                  min="0" max="100" step="0.1"
                  value={frontToSlider(Math.round(zoomLevelFront))}
                  onChange={handleSlider}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer outline-none"
                  style={{
                    background: `linear-gradient(to right,
                      hsl(var(--primary)) 0%,
                      hsl(var(--primary)) ${frontToSlider(Math.round(zoomLevelFront))}%,
                      hsl(var(--muted)) ${frontToSlider(Math.round(zoomLevelFront))}%,
                      hsl(var(--muted)) 100%)`
                  }}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium px-1">
                  <span>50%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-1.5 px-4 pb-3">
              <button
                onClick={handleOut}
                disabled={zoomLevelFront <= 50}
                className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex items-center justify-center
                  ${zoomLevelFront <= 50 ? 'opacity-50 cursor-not-allowed' : tc.action}`}
                title="Diminuir"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                onClick={handleReset}
                className={`px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center ${tc.action}`}
                title="Resetar para 100%"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={handleIn}
                disabled={zoomLevelFront >= 200}
                className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex items-center justify-center
                  ${zoomLevelFront >= 200 ? 'opacity-50 cursor-not-allowed' : tc.action}`}
                title="Aumentar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Zoom;
