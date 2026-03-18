# Profile Design System

Este documento contém todo o código necessário para implementar a interface do Perfil de Usuário, incluindo o layout principal, o banner e o card 3D com efeito de *tilt* holográfico. O código foi limpo de lógicas de negócio específicas (Supabase, Neon, etc) mantendo apenas a estrutura visual com Tailwind CSS e React.

## 1. CSS Principal do Card Animado (`ProfileCard.css`)

Este arquivo deve ser importado globalmente ou no componente pai. Ele contém a engine visual de gradientes, reflexos e as variáveis css controladas pelo React.

```css
/* ProfileCard.css */
:root {
  --pointer-x: 50%;
  --pointer-y: 50%;
  --pointer-from-center: 0;
  --pointer-from-top: 0.5;
  --pointer-from-left: 0.5;
  --card-opacity: 0;
  --rotate-x: 0deg;
  --rotate-y: 0deg;
  --background-x: 50%;
  --background-y: 50%;
  --grain: none;
  --icon: none;
  --behind-gradient: none;
  --behind-glow-color: rgba(26, 147, 134, 0.5);
  --behind-glow-size: 25%;
  --inner-gradient: none;
  --sunpillar-1: hsl(2, 100%, 73%);
  --sunpillar-2: hsl(53, 100%, 69%);
  --sunpillar-3: hsl(93, 100%, 69%);
  --sunpillar-4: hsl(176, 100%, 76%);
  --sunpillar-5: hsl(228, 100%, 74%);
  --sunpillar-6: hsl(283, 100%, 73%);
  --sunpillar-clr-1: var(--sunpillar-1);
  --sunpillar-clr-2: var(--sunpillar-2);
  --sunpillar-clr-3: var(--sunpillar-3);
  --sunpillar-clr-4: var(--sunpillar-4);
  --sunpillar-clr-5: var(--sunpillar-5);
  --sunpillar-clr-6: var(--sunpillar-6);
  --card-radius: 30px;
}

/* ── Layout Base ── */
.pc-card-wrapper {
  perspective: 500px;
  transform: translate3d(0, 0, 0.1px);
  position: relative;
  touch-action: none;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pc-card-wrapper:hover,
.pc-card-wrapper.active {
  --card-opacity: 1;
}

.pc-card {
  height: auto;
  max-height: 560px;
  min-height: 420px;
  width: 100%;
  display: grid;
  aspect-ratio: 0.82;
  border-radius: var(--card-radius);
  position: relative;
  background-blend-mode: color-dodge, normal, normal, normal, overlay;
  animation: glow-bg 12s linear infinite;
  box-shadow:
    rgba(0, 0, 0, 0.8) calc((var(--pointer-from-left) * 10px) - 3px) calc((var(--pointer-from-top) * 20px) - 6px) 20px -5px,
    rgba(26, 147, 134, 0.3) 0px 0px 60px -20px,
    rgba(26, 147, 134, 0.2) 0px 0px 100px -30px;
  transition: transform 1s ease;
  transform: translateZ(0) rotateX(0deg) rotateY(0deg);
  background: rgba(0, 0, 0, 0.9);
  backface-visibility: hidden;
  overflow: hidden;
  backdrop-filter: blur(1px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.pc-card:hover,
.pc-card.active {
  transition: none;
  transform: translateZ(0) rotateX(var(--rotate-y)) rotateY(var(--rotate-x));
}

.pc-card-shell.entering .pc-card {
  transition: transform 180ms ease-out;
}

.pc-card-shell { position: relative; z-index: 1; }
.pc-card > * { display: grid; grid-area: 1/-1; border-radius: var(--card-radius); pointer-events: none; }
.pc-inside > *:not(.pc-microcard-container) { display: grid; grid-area: 1/-1; border-radius: var(--card-radius); pointer-events: none; }

/* ── Glow atrás do card ── */
.pc-behind {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(circle at var(--pointer-x) var(--pointer-y), var(--behind-glow-color) 0%, transparent var(--behind-glow-size));
  filter: blur(50px) saturate(1.1);
  opacity: calc(0.8 * var(--card-opacity));
  transition: opacity 200ms ease;
}

/* ── Microcard interno ── */
.pc-microcard-container {
  display: flex !important; grid-area: auto !important; pointer-events: auto !important;
  min-width: 0; overflow: hidden;
}
.pc-shine, .pc-shine::before, .pc-shine::after, .pc-glare, .pc-inside, .pc-avatar-content, .pc-avatar-content::before { pointer-events: none !important; }

/* ── Camada Interna & Texturas ── */
.pc-inside {
  inset: 0; position: absolute;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E"),
    radial-gradient(circle at 1px 1px, rgba(26, 147, 134, 0.15) 1px, transparent 0),
    linear-gradient(to bottom, rgba(26, 147, 134, 0.35) 0%, rgba(0, 0, 0, 0.88) 100%),
    var(--inner-gradient);
  background-color: rgba(26, 147, 134, 0.2);
  background-size: 100% 100%, 20px 20px, 100% 100%, 100% 100%;
}

/* ── Shine (Holográfico) ── */
.pc-shine {
  mask-image: var(--icon); -webkit-mask-image: var(--icon);
  mask-mode: alpha; mask-size: 60% auto; mask-position: center center;
  transition: filter 0.8s ease;
  filter: brightness(1.1) contrast(1.2) saturate(1.8) opacity(0.6);
  animation: holo-bg 18s linear infinite; mix-blend-mode: color-dodge;
}

/* ── Glare ── */
.pc-glare {
  transform: translate3d(0, 0, 1.1px); overflow: hidden;
  background-image: radial-gradient(farthest-corner circle at var(--pointer-x) var(--pointer-y), rgba(255, 255, 255, 0.15) 0%, rgba(26, 147, 134, 0.2) 20%, hsla(207, 40%, 30%, 0.6) 60%, hsla(207, 40%, 30%, 0.8) 90%);
  mix-blend-mode: overlay; filter: brightness(0.8) contrast(1.2);
  z-index: 4; pointer-events: none !important;
}

/* ── Avatar Parallax ── */
.pc-avatar-content { mix-blend-mode: normal; overflow: hidden; transform: translateZ(2); backface-visibility: hidden; position: relative; opacity: 1; pointer-events: none; }
.pc-avatar-content .avatar {
  width: 100%; height: 100%; position: absolute; left: 50%; top: 50%; transform-origin: 50% 50%;
  transform: translateX(calc(-50% + (var(--pointer-from-left) - 0.5) * 6px)) translateY(calc(-50% + (var(--pointer-from-top) - 0.5) * 6px)) scaleY(calc(1 + (var(--pointer-from-top) - 0.5) * 0.02)) scaleX(calc(1 + (var(--pointer-from-left) - 0.5) * 0.01));
  object-fit: cover; transition: transform 120ms ease-out;
}

/* ── Animações ── */
@keyframes glow-bg { 0% { --bgrotate: 0deg; } 100% { --bgrotate: 360deg; } }
@keyframes holo-bg {
  0% { background-position: 0 var(--background-y), 0 0, center; }
  100% { background-position: 0 var(--background-y), 90% 90%, center; }
}
@media (max-width: 768px) { .pc-card { height: 70svh; max-height: 520px; } }
```

## 2. Componente React: Micro Card (`ProfileCardMicro.tsx`)

Pequeno widget de identificação fixado no canto inferior do Card 3D.

```tsx
import React from 'react';
import { Info } from 'lucide-react';

export function ProfileCardMicro({ displayName, username, avatarUrl, onInfoClick }: any) {
  return (
    <div
      className="pc-microcard-container absolute bottom-4 left-4 right-4 z-[10000]
                 flex items-center gap-2
                 bg-[rgba(8,60,52,0.75)] backdrop-blur-[12px]
                 border border-[rgba(26,147,134,0.25)]
                 rounded-2xl px-3 py-2 pointer-events-auto isolate"
      style={{ transform: 'translateZ(0)', minWidth: 0, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
        <img
          src={avatarUrl}
          alt="Avatar"
          className="rounded-full object-cover ring-1 ring-white/15 w-8 h-8 shrink-0"
        />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', lineHeight: 1.2 }}>
          <span className="text-xs font-semibold text-white truncate text-shadow-sm">
            {displayName}
          </span>
          <span className="text-[11px] text-teal-200/80 truncate mt-[2px]">
            @{username}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onInfoClick?.(); }}
        className="flex items-center justify-center rounded-full shrink-0 w-7 h-7
                   bg-white/10 border border-white/15 cursor-pointer transition-all duration-200
                   hover:bg-teal-500/30 hover:border-teal-400/40 hover:scale-110 active:scale-95"
      >
        <Info className="w-3.5 h-3.5 text-white/80" />
      </button>
    </div>
  );
}
```

## 3. Componente React: Card Animado 3D (`ProfileCard.tsx`)

Controla a lógica do mouse e giroscópio (via CSS variables) integrando com o CSS criado anteriormente.

```tsx
import React, { useEffect, useRef, useMemo } from 'react';
import './ProfileCard.css';
import { ProfileCardMicro } from './ProfileCardMicro';

const clamp  = (v: number, mn = 0, mx = 100) => Math.min(Math.max(v, mn), mx);
const round  = (v: number, p = 3) => parseFloat(v.toFixed(p));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

export function ProfileCard({
  userData,
  enableTilt = true,
  iconUrl = '/sua-logo-holografica.svg', 
  onOpenInfo
}: any) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null;
    let rafId: number | null = null, running = false, lastTs = 0;
    let cx = 0, cy = 0, tx = 0, ty = 0;

    const setVars = (x: number, y: number) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;
      
      const w = shell.clientWidth || 1, h = shell.clientHeight || 1;
      const px = clamp((100 / w) * x), py = clamp((100 / h) * y);
      const centerX = px - 50, centerY = py - 50;

      const styles = {
        '--pointer-x': `${px}%`,
        '--pointer-y': `${py}%`,
        '--background-x': `${adjust(px, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(py, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(py - 50, px - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${py / 100}`,
        '--pointer-from-left': `${px / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`,
      };
      
      Object.entries(styles).forEach(([k, v]) => wrap.style.setProperty(k, v));
    };

    const step = (ts: number) => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      
      const k = 1 - Math.exp(-dt / 0.14);
      cx += (tx - cx) * k; cy += (ty - cy) * k;
      setVars(cx, cy);

      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false; lastTs = 0;
      }
    };

    const start = () => { if (!running) { running = true; lastTs = 0; rafId = requestAnimationFrame(step); } };

    return {
      setTarget(x: number, y: number) { tx = x; ty = y; start(); },
      toCenter() { const s = shellRef.current; if (s) this.setTarget(s.clientWidth / 2, s.clientHeight / 2); },
      cancel() { if (rafId) cancelAnimationFrame(rafId); running = false; }
    };
  }, [enableTilt]);

  useEffect(() => {
    const s = shellRef.current;
    if (!s || !tiltEngine) return;

    const onMove = (e: PointerEvent) => {
      const r = s.getBoundingClientRect();
      tiltEngine.setTarget(e.clientX - r.left, e.clientY - r.top);
    };
    const onEnter = () => s.classList.add('active');
    const onLeave = () => { s.classList.remove('active'); tiltEngine.toCenter(); };

    s.addEventListener('pointerenter', onEnter);
    s.addEventListener('pointermove', onMove);
    s.addEventListener('pointerleave', onLeave);

    return () => {
      s.removeEventListener('pointerenter', onEnter);
      s.removeEventListener('pointermove', onMove);
      s.removeEventListener('pointerleave', onLeave);
      tiltEngine.cancel();
    };
  }, [tiltEngine]);

  const cardStyle = { '--icon': `url("${iconUrl}")`, '--inner-gradient': 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)' } as React.CSSProperties;

  return (
    <div ref={wrapRef} className="pc-card-wrapper" style={cardStyle}>
      <div className="pc-behind" />
      <div ref={shellRef} className="pc-card-shell w-full max-w-[380px] lg:max-w-none">
        <section className="pc-card">
          <div className="pc-inside">
            <div className="pc-shine" />
            <div className="pc-glare" />
            <div className="pc-content pc-avatar-content relative">
              <img src={userData.avatar} alt="Avatar" className="avatar" />
              <ProfileCardMicro 
                displayName={userData.name} 
                username={userData.username} 
                avatarUrl={userData.avatar}
                onInfoClick={onOpenInfo}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
```

## 4. Componente React: Banner Superior (`ProfileBanner.tsx`)

Renderiza a imagem de capa com um botão de ação com visual glassmorphism no canto inferior direito.

```tsx
import React from 'react';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button'; 
import { cn } from '@/lib/utils';

export function ProfileBanner({ bannerUrl, onOpenPicker }: { bannerUrl: string, onOpenPicker: () => void }) {
  return (
    <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-muted">
      <img
        src={bannerUrl}
        alt="Banner"
        className="w-full h-full object-cover animate-in fade-in duration-500"
      />
      {/* Sombra suave na base para garantir leitura sobre o banner */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

      <div className="absolute bottom-3 right-3 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenPicker}
          className={cn(
            'h-9 w-9 rounded-full border-2 transition-all duration-200',
            'border-slate-100 dark:border-slate-800',
            'bg-slate-100/90 dark:bg-slate-800',
            'hover:bg-slate-300 dark:hover:bg-slate-700',
          )}
        >
          <LayoutGrid className="w-4 h-4 text-slate-700 dark:text-slate-200" />
        </Button>
      </div>
    </div>
  );
}
```

## 5. View Principal: Layout Completo (`ProfileView.tsx`)

Une todas as peças usando um sistema de Grid responsivo:
- Mobile: Banner -> Card 3D -> Tabs empilhados
- Desktop: Banner topo, Card fixado na esquerda e área de conteúdo expansível na direita.

```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Componentes Base tipo Shadcn UI
import { User, Lock, Building2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ProfileBanner } from './ProfileBanner';
import { ProfileCard } from './ProfileCard';

export function ProfileView() {
  const [bannerUrl, setBannerUrl] = useState('/banner-placeholder.jpg');
  
  // Exemplo de modelagem do estado do usuário
  const userData = {
    name: 'Bruno Souza',
    username: 'brunosouza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bruno',
  };

  return (
    <div className="space-y-6 w-full max-w-[1400px] mx-auto p-4 md:p-6">
      
      {/* BANNER SECTION */}
      <ProfileBanner 
        bannerUrl={bannerUrl} 
        onOpenPicker={() => console.log('Ação: Selecionar capa')} 
      />

      {/* GRID PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:gap-8 items-start">
        
        {/* COLUNA ESQUERDA: Card Animado fixo na rolagem (sticky) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center lg:justify-start lg:sticky lg:top-24 z-10"
        >
          <ProfileCard 
            userData={userData}
            onOpenInfo={() => console.log('Ação: Abrir modal do card')} 
          />
        </motion.div>

        {/* COLUNA DIREITA: Área de Formulários com Tabs e Efeito Blur */}
        <div className="min-w-0 rounded-xl border border-border/70 bg-card/50 dark:bg-card/30 backdrop-blur-sm p-6 shadow-sm">
          <Tabs defaultValue="publico" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full mb-6">
              
              <TabsList className="flex justify-start items-center gap-2 p-0 h-10 bg-transparent border-0 w-full sm:w-auto">
                {[
                  { value: 'publico', Icon: User, label: 'Público' },
                  { value: 'corporativo', Icon: Building2, label: 'Corporativo' },
                  { value: 'seguranca', Icon: Lock, label: 'Segurança' },
                ].map(({ value, Icon, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className={cn(
                      'group flex items-center justify-center h-10 text-sm font-medium outline-none rounded-full shrink-0 select-none cursor-pointer',
                      'transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]',
                      'data-[state=inactive]:w-10 data-[state=inactive]:bg-muted/40 data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/70',
                      'data-[state=active]:w-auto data-[state=active]:px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span
                      className={cn(
                        'overflow-hidden whitespace-nowrap text-sm transition-[max-width,opacity,margin] duration-300 ease-out',
                        'max-w-0 opacity-0 ml-0',
                        'group-data-[state=active]:max-w-[120px] group-data-[state=active]:opacity-100 group-data-[state=active]:ml-1.5'
                      )}
                    >
                      {label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <Button className="gap-2 w-full sm:w-auto min-w-[140px] shrink-0">
                <Save className="w-4 h-4" /> Salvar
              </Button>
            </div>

            {/* CONTEÚDO DAS TABS */}
            <div className="mt-4">
              <TabsContent value="publico" className="outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
                {/* Aqui entra o formulário de dados públicos */}
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg text-muted-foreground bg-muted/20">Área do Formulário Público</div>
              </TabsContent>

              <TabsContent value="corporativo" className="outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
                {/* Aqui entra a leitura dos dados do Neon/RH */}
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg text-muted-foreground bg-muted/20">Área de Dados Corporativos</div>
              </TabsContent>

              <TabsContent value="seguranca" className="outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-4 data-[state=active]:duration-700 ease-out">
                {/* Aqui entra formulário de troca de senha */}
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg text-muted-foreground bg-muted/20">Área de Segurança (Senhas)</div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
```
