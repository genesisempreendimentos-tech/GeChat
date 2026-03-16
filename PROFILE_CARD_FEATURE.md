# Profile Card Feature — Implementação Completa

Card de perfil 3D com efeito tilt ao mouse, brilho holográfico, glare, glow atrás do card,
e barra micro-info no rodapé. Basta seguir os passos abaixo em qualquer projeto React + Tailwind.

---

## Visão Geral

| Item | Detalhe |
|---|---|
| **Efeito 3D** | `rotateX` / `rotateY` via CSS vars, interpolação suave (spring tau) |
| **Brilho holográfico** | `.pc-shine` — gradientes de arco-íris + máscara da logo |
| **Glare** | `.pc-glare` — gradiente radial seguindo o cursor |
| **Glow atrás** | `.pc-behind` — radial blur cor brand |
| **Micro info** | Avatar + nome + @handle + botão info — fixo no rodapé do card |
| **Popup de info** | Dialog com avatar, nome, profissão, aniversário, redes sociais |
| **Persistência de dados** | Supabase `users` — `full_name`, `username`, `profession`, `avatar_url`, etc. |
| **Logo** | Qualquer URL de imagem — passada via prop `iconUrl` |
| **Cor brand** | `#1A9386` — substitua pela cor do seu projeto |

---

## Arquitetura

```
ProfileCard.jsx
  ├── CSS: ProfileCard.css (importa os 5 arquivos abaixo)
  │     ├── ProfileCardVariables.css   — variáveis CSS das animações
  │     ├── ProfileCardLayout.css      — estrutura, tamanho, grid
  │     ├── ProfileCardEffects.css     — behind, shine, glare, inside
  │     ├── ProfileCardAvatar.css      — parallax do avatar
  │     └── ProfileCardAnimations.css  — keyframes glow-bg e holo-bg
  ├── tiltEngine (useMemo) — rAF loop com spring tau para suavidade
  ├── ProfileCardMicro.jsx — barra info no rodapé do card
  └── ProfileCardInfoPopup.jsx — dialog de informações detalhadas
```

---

## Passo 1 — Estrutura de Pastas

```
src/components/profile/ProfileCard/
├── ProfileCard.jsx
├── ProfileCardMicro.jsx
├── ProfileCardInfoPopup.jsx
└── Assets/
    ├── ProfileCard.css               ← arquivo de entrada (importa os 5)
    └── StyleCss/
        ├── ProfileCardVariables.css
        ├── ProfileCardLayout.css
        ├── ProfileCardEffects.css
        ├── ProfileCardAvatar.css
        └── ProfileCardAnimations.css
```

---

## Passo 2 — CSS: ProfileCardVariables.css

```css
/* ProfileCardVariables.css */
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
  --icon: none;               /* URL da logo: url("...") */
  --behind-gradient: none;
  --behind-glow-color: rgba(26, 147, 134, 0.5);   /* ← cor brand */
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
```

> **Para trocar a cor brand:** substitua todas as ocorrências de `rgba(26, 147, 134, X)`
> pela cor do seu projeto nos arquivos de effects e variables.

---

## Passo 3 — CSS: ProfileCardLayout.css

```css
/* ProfileCardLayout.css */
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
  height: 80svh;
  max-height: 600px;
  min-height: 500px;
  width: 100%;
  display: grid;
  aspect-ratio: 0.718;
  border-radius: var(--card-radius);
  position: relative;
  background-blend-mode: color-dodge, normal, normal, normal, overlay;
  animation: glow-bg 12s linear infinite;
  box-shadow:
    rgba(0, 0, 0, 0.8)
      calc((var(--pointer-from-left) * 10px) - 3px)
      calc((var(--pointer-from-top) * 20px) - 6px)
      20px -5px,
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

.pc-card-shell {
  position: relative;
  z-index: 1;
}

/* Todos os filhos do .pc-card ocupam o mesmo grid-area (sobreposição) */
.pc-card > * {
  display: grid;
  grid-area: 1/-1;
  border-radius: var(--card-radius);
  pointer-events: none;
}

/* Camadas dentro do .pc-inside (effects) */
.pc-inside > *:not(.pc-microcard-container) {
  display: grid;
  grid-area: 1/-1;
  border-radius: var(--card-radius);
  pointer-events: none;
}

/* Microcard: exceção — não segue o layout grid */
.pc-microcard-container {
  display: flex !important;
  grid-area: auto !important;
  pointer-events: auto !important;
}

/* Garantir que efeitos NUNCA bloqueiem cliques */
.pc-shine,
.pc-shine::before,
.pc-shine::after,
.pc-glare,
.pc-inside,
.pc-avatar-content,
.pc-avatar-content::before {
  pointer-events: none !important;
}

@media (max-width: 768px) {
  .pc-card { height: 70svh; max-height: 450px; }
}
@media (max-width: 480px) {
  .pc-card { height: 60svh; max-height: 380px; }
}
@media (max-width: 320px) {
  .pc-card { height: 55svh; max-height: 320px; }
}
```

---

## Passo 4 — CSS: ProfileCardEffects.css

```css
/* ProfileCardEffects.css */

/* ── Glow atrás do card ──────────────────────────────────── */
.pc-behind {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at var(--pointer-x) var(--pointer-y),
    var(--behind-glow-color) 0%,
    transparent var(--behind-glow-size)
  );
  filter: blur(50px) saturate(1.1);
  opacity: calc(0.8 * var(--card-opacity));
  transition: opacity 200ms ease;
}

/* ── Camada interna (textura + gradiente vertical) ────────── */
.pc-inside {
  inset: 0;
  position: absolute;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.25'/%3E%3C/svg%3E"),
    radial-gradient(circle at 1px 1px, rgba(26, 147, 134, 0.15) 1px, transparent 0),
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 3px,
      rgba(26, 147, 134, 0.05) 3px,
      rgba(26, 147, 134, 0.05) 6px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 3px,
      rgba(26, 147, 134, 0.03) 3px,
      rgba(26, 147, 134, 0.03) 6px
    ),
    linear-gradient(to bottom,
      rgba(26, 147, 134, 0.35)  0%,
      rgba(26, 147, 134, 0.32) 10%,
      rgba(26, 147, 134, 0.28) 20%,
      rgba(26, 147, 134, 0.25) 30%,
      rgba(26, 147, 134, 0.22) 40%,
      rgba(26, 147, 134, 0.18) 48%,
      rgba(26, 147, 134, 0.15) 52%,
      rgba(26, 147, 134, 0.12) 56%,
      rgba(26, 147, 134, 0.08) 60%,
      rgba(26, 147, 134, 0.05) 63%,
      rgba(0, 0, 0, 0.15)      66%,
      rgba(0, 0, 0, 0.25)      70%,
      rgba(0, 0, 0, 0.40)      75%,
      rgba(0, 0, 0, 0.55)      80%,
      rgba(0, 0, 0, 0.70)      85%,
      rgba(0, 0, 0, 0.80)      90%,
      rgba(0, 0, 0, 0.88)     100%
    ),
    var(--inner-gradient);
  background-color: rgba(26, 147, 134, 0.2);
  background-size:
    100% 100%,
    20px 20px,
    30px 30px,
    30px 30px,
    100% 100%,
    100% 100%;
  transform: none;
}

/* ── Shine (holográfico com máscara da logo) ─────────────── */
.pc-shine {
  mask-image: var(--icon);
  -webkit-mask-image: var(--icon);
  mask-mode: alpha;
  -webkit-mask-mode: alpha;
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-size: 60% auto;
  -webkit-mask-size: 60% auto;
  mask-position: center center;
  -webkit-mask-position: center center;
  transition: filter 0.8s ease;
  filter: brightness(1.1) contrast(1.2) saturate(1.8) opacity(0.6);
  animation: holo-bg 18s linear infinite;
  animation-play-state: running;
  mix-blend-mode: color-dodge;
}

.pc-shine,
.pc-shine::after {
  --space: 5%;
  --angle: -45deg;
  transform: translate3d(0, 0, 1px);
  overflow: hidden;
  z-index: 3;
  pointer-events: none !important;
  touch-action: none;
  background: transparent;
  background-size: cover;
  background-position: center;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.2'/%3E%3C/svg%3E"),
    repeating-linear-gradient(
      0deg,
      var(--sunpillar-clr-1) calc(var(--space) * 1),
      var(--sunpillar-clr-2) calc(var(--space) * 2),
      var(--sunpillar-clr-3) calc(var(--space) * 3),
      var(--sunpillar-clr-4) calc(var(--space) * 4),
      var(--sunpillar-clr-5) calc(var(--space) * 5),
      var(--sunpillar-clr-6) calc(var(--space) * 6),
      var(--sunpillar-clr-1) calc(var(--space) * 7)
    ),
    repeating-linear-gradient(
      var(--angle),
      #0e152e 0%,
      hsl(180, 10%, 60%) 3.8%,
      hsl(180, 29%, 66%) 4.5%,
      hsl(180, 10%, 60%) 5.2%,
      #0e152e 10%,
      #0e152e 12%
    ),
    radial-gradient(
      farthest-corner circle at var(--pointer-x) var(--pointer-y),
      hsla(0, 0%, 0%, 0.1)  12%,
      hsla(0, 0%, 0%, 0.15) 20%,
      hsla(0, 0%, 0%, 0.25) 120%
    );
  background-position:
    center,
    0 var(--background-y),
    var(--background-x) var(--background-y),
    center;
  background-blend-mode: overlay, color, hard-light, normal;
  background-size:
    200% 200%,
    500% 500%,
    300% 300%,
    200% 200%;
  background-repeat: repeat;
}

.pc-shine::before,
.pc-shine::after {
  content: '';
  background-position: center;
  background-size: cover;
  grid-area: 1/1;
  opacity: 0;
  transition: opacity 0.8s ease;
}

.pc-card:hover .pc-shine,
.pc-card.active .pc-shine {
  filter: brightness(1.2) contrast(1.3) saturate(2.2) opacity(0.75);
  animation-play-state: paused;
}

.pc-card:hover .pc-shine::before,
.pc-card.active .pc-shine::before,
.pc-card:hover .pc-shine::after,
.pc-card.active .pc-shine::after {
  opacity: 1;
  pointer-events: none !important;
}

.pc-shine::before {
  background-image:
    linear-gradient(
      45deg,
      var(--sunpillar-4),
      var(--sunpillar-5),
      var(--sunpillar-6),
      var(--sunpillar-1),
      var(--sunpillar-2),
      var(--sunpillar-3)
    ),
    radial-gradient(
      circle at var(--pointer-x) var(--pointer-y),
      hsl(0, 0%, 70%) 0%,
      hsla(0, 0%, 30%, 0.2) 90%
    ),
    var(--grain);
  background-size:
    250% 250%,
    100% 100%,
    220px 220px;
  background-position:
    var(--pointer-x) var(--pointer-y),
    center,
    calc(var(--pointer-x) * 0.01) calc(var(--pointer-y) * 0.01);
  background-blend-mode: color-dodge;
  filter:
    brightness(calc(2 - var(--pointer-from-center)))
    contrast(calc(var(--pointer-from-center) + 2))
    saturate(calc(0.5 + var(--pointer-from-center)));
  mix-blend-mode: luminosity;
}

.pc-shine::after {
  background-position:
    0 var(--background-y),
    calc(var(--background-x) * 0.4) calc(var(--background-y) * 0.5),
    center;
  background-size:
    200% 300%,
    700% 700%,
    100% 100%;
  mix-blend-mode: difference;
  filter: brightness(0.8) contrast(1.5);
}

/* ── Glare (reflexo radial) ──────────────────────────────── */
.pc-glare {
  transform: translate3d(0, 0, 1.1px);
  overflow: hidden;
  background-image:
    radial-gradient(
      farthest-corner circle at var(--pointer-x) var(--pointer-y),
      rgba(255, 255, 255, 0.15)   0%,
      rgba(26, 147, 134, 0.2)    20%,
      hsla(207, 40%, 30%, 0.6)   60%,
      hsla(207, 40%, 30%, 0.8)   90%
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(255, 255, 255, 0.02) 1px,
      rgba(255, 255, 255, 0.02) 2px
    );
  mix-blend-mode: overlay;
  filter: brightness(0.8) contrast(1.2);
  z-index: 4;
  pointer-events: none !important;
  background-size: 100% 100%, 4px 4px;
}
```

---

## Passo 5 — CSS: ProfileCardAvatar.css

```css
/* ProfileCardAvatar.css */
.pc-avatar-content {
  mix-blend-mode: normal;
  overflow: hidden;
  transform: translateZ(2);
  backface-visibility: hidden;
  position: relative;
  opacity: 1;
  pointer-events: none;
}

/* Parallax sutil do avatar seguindo o cursor */
.pc-avatar-content .avatar {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: 50% 50%;
  transform:
    translateX(calc(-50% + (var(--pointer-from-left) - 0.5) * 6px))
    translateY(calc(-50% + (var(--pointer-from-top)  - 0.5) * 6px))
    translateZ(0)
    scaleY(calc(1 + (var(--pointer-from-top)  - 0.5) * 0.02))
    scaleX(calc(1 + (var(--pointer-from-left) - 0.5) * 0.01));
  object-fit: cover;
  object-position: center center;
  backface-visibility: hidden;
  will-change: transform;
  transition: transform 120ms ease-out;
}

.pc-avatar-content::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  backdrop-filter: none;
  pointer-events: none !important;
}
```

---

## Passo 6 — CSS: ProfileCardAnimations.css

```css
/* ProfileCardAnimations.css */
@keyframes glow-bg {
  0%   { --bgrotate: 0deg; }
  100% { --bgrotate: 360deg; }
}

@keyframes holo-bg {
  0% {
    background-position:
      0 var(--background-y),
      0 0,
      center;
  }
  100% {
    background-position:
      0 var(--background-y),
      90% 90%,
      center;
  }
}
```

---

## Passo 7 — CSS: ProfileCard.css (entrada)

```css
/* ProfileCard.css — apenas importações */
@import './StyleCss/ProfileCardVariables.css';
@import './StyleCss/ProfileCardLayout.css';
@import './StyleCss/ProfileCardEffects.css';
@import './StyleCss/ProfileCardAvatar.css';
@import './StyleCss/ProfileCardAnimations.css';
```

---

## Passo 8 — ProfileCardMicro.jsx

Barra de informações fixada no rodapé do card (nome + @handle + botão info):

```jsx
// ProfileCardMicro.jsx
import React from 'react'
import { Info } from 'lucide-react'

export default function ProfileCardMicro({ name, username, avatarUrl, onInfoClick }) {
  return (
    <div
      className="pc-microcard-container absolute bottom-5 left-5 right-5 z-[10000]
                 flex items-center justify-between
                 bg-[rgba(13,90,80,0.8)] backdrop-blur-[10px]
                 border border-[rgba(2,53,47,0.5)]
                 rounded-[calc(max(0px,30px-20px+6px))]
                 px-3.5 py-3 pointer-events-auto isolate"
      style={{ transform: 'translateZ(0)' }}
    >
      {/* Avatar + texto */}
      <div className="flex items-center gap-3 flex-1 min-w-0" style={{ transform: 'translateZ(0)' }}>
        <div className="w-12 h-12 rounded-full overflow-hidden border border-[rgba(255,255,255,0.1)] flex-shrink-0">
          <img
            src={avatarUrl}
            alt={`${name} mini avatar`}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div
            className="text-[15px] font-semibold text-white/95 leading-tight tracking-wide truncate"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            {name}
          </div>
          <div
            className="text-[15px] font-normal text-white/85 leading-tight tracking-wide truncate"
            style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
          >
            @{username}
          </div>
        </div>
      </div>

      {/* Botão info */}
      <button
        className="w-6 h-6 flex items-center justify-center rounded
                   bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)]
                   transition-all duration-200 cursor-pointer
                   hover:bg-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)]
                   hover:scale-110 flex-shrink-0 ml-3"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onInfoClick?.() }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        type="button"
        aria-label="Informações"
        style={{ transform: 'translateZ(0)' }}
      >
        <Info className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  )
}
```

---

## Passo 9 — ProfileCardInfoPopup.jsx

Dialog com informações completas do usuário:

```jsx
// ProfileCardInfoPopup.jsx
import React, { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Cake, MessageCircle, Instagram, Linkedin } from 'lucide-react'

// Helpers para construir URLs sociais
const digitsOnly   = (v) => (v || '').replace(/\D+/g, '')
const buildIG      = (v) => {
  if (!v) return ''
  v = String(v).trim()
  if (v.startsWith('http')) return v
  if (v.startsWith('@')) v = v.slice(1)
  return `https://www.instagram.com/${v.replace(/^\/+|\/+$/g, '')}/`
}
const buildLI      = (v) => {
  if (!v) return ''
  v = String(v).trim()
  return v.startsWith('http') ? v : `https://www.linkedin.com/in/${v.replace(/^in\/|^@/, '')}`
}
const buildWA      = (rawWA, senderName, senderUser) => {
  const phone = digitsOnly(rawWA)
  if (!phone) return ''
  const name = senderName?.trim() || senderUser || 'usuário'
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(`Olá, sou o ${name} e vim do app!`)}`
}

// Formatar data
const formatDate = (raw) => {
  if (!raw) return null
  try {
    const s = String(raw).trim()
    const iso = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
    const br  = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
    let d
    if (iso) d = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
    else if (br) d = new Date(parseInt(br[3]), parseInt(br[2]) - 1, parseInt(br[1]))
    else d = new Date(s)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('pt-BR')
  } catch { return null }
}

export default function ProfileCardInfoPopup({ open, onOpenChange, userData, currentUser }) {
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => { if (open) setAvatarError(false) }, [open, userData])

  const data = useMemo(() => {
    if (!userData) return null
    return {
      name:        userData.full_name || userData.name || 'Usuário',
      username:    userData.username  || userData.handle || '',
      description: userData.description || '',
      profession:  userData.profession  || userData.title || '',
      avatarUrl:   userData.avatar_url  || userData.avatarUrl || '',
      birthday:    formatDate(userData.birthday),
      memberSince: formatDate(userData.created_at),
      whatsapp:    userData.whatsapp  || '',
      instagram:   userData.instagram || '',
      linkedin:    userData.linkedin  || '',
    }
  }, [userData])

  const senderName = currentUser?.full_name || currentUser?.user_metadata?.full_name || ''
  const senderUser = currentUser?.username  || currentUser?.email?.split('@')[0] || ''

  if (!data) return null

  const waUrl = buildWA(data.whatsapp, senderName, senderUser)
  const igUrl = buildIG(data.instagram)
  const liUrl = buildLI(data.linkedin)

  const open_ = (url) => url && window.open(url, '_blank', 'noopener,noreferrer')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 overflow-visible rounded-xl"
        style={{ boxShadow: '0 0 20px rgba(26,147,134,0.4), 0 0 40px rgba(26,147,134,0.2)' }}
      >
        <DialogTitle className="sr-only">Perfil — {data.name}</DialogTitle>
        <DialogDescription className="sr-only">Informações de {data.name}</DialogDescription>

        <div className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50
                        dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
                        text-slate-900 dark:text-white overflow-hidden rounded-xl">
          <div className="pt-6 pb-6 px-6">

            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden
                              border-4 border-slate-200 dark:border-slate-700
                              shadow-xl bg-slate-200 dark:bg-slate-700
                              flex items-center justify-center">
                {!avatarError ? (
                  <img
                    src={data.avatarUrl}
                    alt={data.name}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="text-3xl font-bold text-slate-600 dark:text-slate-300">
                    {data.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Nome */}
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold">{data.name}</h2>
            </div>

            {/* Username */}
            <div className="text-center mb-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm">@{data.username}</p>
            </div>

            {/* Descrição */}
            {data.description && (
              <div className="text-center mb-4 px-4">
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                  {data.description}
                </p>
              </div>
            )}

            {/* Profissão */}
            {data.profession && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2
                                bg-teal-100 dark:bg-teal-500/20
                                border border-teal-300 dark:border-teal-400/30
                                rounded-full">
                  <span className="text-teal-700 dark:text-teal-300 font-medium text-sm">
                    {data.profession}
                  </span>
                </div>
              </div>
            )}

            {/* Rodapé: aniversário | redes | membro desde */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-3 items-center gap-4">

                {/* Aniversário */}
                <div className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-slate-600 dark:text-slate-300 flex-shrink-0" />
                  {data.birthday && (
                    <span className="text-sm text-slate-700 dark:text-slate-300">{data.birthday}</span>
                  )}
                </div>

                {/* Redes sociais */}
                <div className="flex items-center gap-3 justify-center">
                  {data.whatsapp && (
                    <button onClick={() => open_(waUrl)} className="transition-all hover:scale-110" title="WhatsApp">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                    </button>
                  )}
                  {data.instagram && (
                    <button onClick={() => open_(igUrl)} className="transition-all hover:scale-110" title="Instagram">
                      <Instagram className="w-5 h-5 text-pink-500" />
                    </button>
                  )}
                  {data.linkedin && (
                    <button onClick={() => open_(liUrl)} className="transition-all hover:scale-110" title="LinkedIn">
                      <Linkedin className="w-5 h-5 text-blue-500" />
                    </button>
                  )}
                </div>

                {/* Membro desde */}
                <div className="text-right">
                  {data.memberSince && (
                    <>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Membro desde</p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                        {data.memberSince}
                      </p>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Passo 10 — ProfileCard.jsx (componente principal)

```jsx
// ProfileCard.jsx
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import './Assets/ProfileCard.css'
import ProfileCardInfoPopup from './ProfileCardInfoPopup'
import ProfileCardMicro     from './ProfileCardMicro'

// ── Constantes ───────────────────────────────────────────────
const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)'

const ANIM = {
  INITIAL_DURATION:  1200,
  INITIAL_X_OFFSET:  70,
  INITIAL_Y_OFFSET:  60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180,
}

// ── Utils ────────────────────────────────────────────────────
const clamp  = (v, mn = 0, mx = 100) => Math.min(Math.max(v, mn), mx)
const round  = (v, p = 3) => parseFloat(v.toFixed(p))
const adjust = (v, fMin, fMax, tMin, tMax) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin))

// ── Componente ───────────────────────────────────────────────
const ProfileCardComponent = ({
  className = '',
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  showUserInfo = true,

  // ↓ URL da logo do seu projeto (máscara do efeito shine holográfico)
  iconUrl = 'https://sua-logo.png',

  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,       // ex: 'rgba(26,147,134,0.5)'
  behindGlowSize,        // ex: '50%'

  // ↓ Dados do usuário — forneça via prop ou busque do seu contexto de autenticação
  userData: externalUserData = null,

  // ↓ Usuário logado (para mensagem WhatsApp no popup)
  currentUser = null,
}) => {
  const wrapRef    = useRef(null)
  const shellRef   = useRef(null)
  const enterTimer = useRef(null)
  const leaveRaf   = useRef(null)
  const [infoOpen, setInfoOpen] = useState(false)

  // ── Extrair dados do usuário ────────────────────────────────
  // Adapte este bloco para a estrutura de dados do seu projeto
  const userData = useMemo(() => {
    if (!externalUserData) return null
    const u = externalUserData
    const username  = u.username  || u.email?.split('@')[0] || ''
    const avatarUrl = u.avatar_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(u.full_name || username)}&background=random`
    return {
      name:      u.full_name || u.email?.split('@')[0] || 'Usuário',
      title:     u.profession || 'Membro',
      handle:    username,
      avatarUrl,
      instagram: u.instagram || '',
      linkedin:  u.linkedin  || '',
      whatsapp:  u.whatsapp  || '',
    }
  }, [externalUserData])

  // ── Tilt engine (rAF loop com spring tau) ──────────────────
  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null

    let rafId = null, running = false, lastTs = 0
    let cx = 0, cy = 0, tx = 0, ty = 0
    const DEFAULT_TAU = 0.14, INITIAL_TAU = 0.6
    let initialUntil = 0

    const setVars = (x, y) => {
      const shell = shellRef.current
      const wrap  = wrapRef.current
      if (!shell || !wrap) return
      const w = shell.clientWidth  || 1
      const h = shell.clientHeight || 1
      const px = clamp((100 / w) * x)
      const py = clamp((100 / h) * y)
      const centerX = px - 50, centerY = py - 50
      for (const [k, v] of Object.entries({
        '--pointer-x':          `${px}%`,
        '--pointer-y':          `${py}%`,
        '--background-x':       `${adjust(px, 0, 100, 35, 65)}%`,
        '--background-y':       `${adjust(py, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(py - 50, px - 50) / 50, 0, 1)}`,
        '--pointer-from-top':    `${py / 100}`,
        '--pointer-from-left':   `${px / 100}`,
        '--rotate-x':            `${round(-(centerX / 5))}deg`,
        '--rotate-y':            `${round(centerY / 4)}deg`,
      })) wrap.style.setProperty(k, v)
    }

    const step = (ts) => {
      if (!running) return
      if (lastTs === 0) lastTs = ts
      const dt  = (ts - lastTs) / 1000
      lastTs = ts
      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU
      const k   = 1 - Math.exp(-dt / tau)
      cx += (tx - cx) * k
      cy += (ty - cy) * k
      setVars(cx, cy)
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 || document.hasFocus()) {
        rafId = requestAnimationFrame(step)
      } else {
        running = false; lastTs = 0
        if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      }
    }

    const start = () => {
      if (running) return
      running = true; lastTs = 0
      rafId = requestAnimationFrame(step)
    }

    return {
      setImmediate(x, y) { cx = x; cy = y; setVars(cx, cy) },
      setTarget(x, y)    { tx = x; ty = y; start() },
      toCenter()         { const s = shellRef.current; if (s) this.setTarget(s.clientWidth / 2, s.clientHeight / 2) },
      beginInitial(ms)   { initialUntil = performance.now() + ms; start() },
      getCurrent()       { return { x: cx, y: cy, tx, ty } },
      cancel()           { if (rafId) cancelAnimationFrame(rafId); rafId = null; running = false; lastTs = 0 },
    }
  }, [enableTilt])

  // ── Event handlers ─────────────────────────────────────────
  const getOffsets = (e, el) => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onMove  = useCallback((e) => {
    const s = shellRef.current; if (!s || !tiltEngine) return
    const { x, y } = getOffsets(e, s); tiltEngine.setTarget(x, y)
  }, [tiltEngine])

  const onEnter = useCallback((e) => {
    const s = shellRef.current; if (!s || !tiltEngine) return
    s.classList.add('active', 'entering')
    if (enterTimer.current) clearTimeout(enterTimer.current)
    enterTimer.current = setTimeout(() => s.classList.remove('entering'), ANIM.ENTER_TRANSITION_MS)
    const { x, y } = getOffsets(e, s); tiltEngine.setTarget(x, y)
  }, [tiltEngine])

  const onLeave = useCallback(() => {
    const s = shellRef.current; if (!s || !tiltEngine) return
    tiltEngine.toCenter()
    const check = () => {
      const { x, y, tx: ttx, ty: tty } = tiltEngine.getCurrent()
      if (Math.hypot(ttx - x, tty - y) < 0.6) { s.classList.remove('active'); leaveRaf.current = null }
      else leaveRaf.current = requestAnimationFrame(check)
    }
    if (leaveRaf.current) cancelAnimationFrame(leaveRaf.current)
    leaveRaf.current = requestAnimationFrame(check)
  }, [tiltEngine])

  const onOrientation = useCallback((e) => {
    const s = shellRef.current; if (!s || !tiltEngine) return
    const { beta, gamma } = e; if (beta == null || gamma == null) return
    const cx_ = s.clientWidth  / 2
    const cy_ = s.clientHeight / 2
    tiltEngine.setTarget(
      clamp(cx_ + gamma * mobileTiltSensitivity, 0, s.clientWidth),
      clamp(cy_ + (beta - ANIM.DEVICE_BETA_OFFSET) * mobileTiltSensitivity, 0, s.clientHeight)
    )
  }, [tiltEngine, mobileTiltSensitivity])

  // ── Registrar eventos ──────────────────────────────────────
  useEffect(() => {
    if (!enableTilt || !tiltEngine) return
    const s = shellRef.current; if (!s) return

    s.addEventListener('pointerenter', onEnter)
    s.addEventListener('pointermove',  onMove)
    s.addEventListener('pointerleave', onLeave)

    const onClick_ = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return
      const A = window.DeviceMotionEvent
      if (A && typeof A.requestPermission === 'function') {
        A.requestPermission().then(st => {
          if (st === 'granted') window.addEventListener('deviceorientation', onOrientation)
        }).catch(console.error)
      } else {
        window.addEventListener('deviceorientation', onOrientation)
      }
    }
    s.addEventListener('click', onClick_)

    // Animação inicial (arrasta de canto para centro)
    tiltEngine.setImmediate(s.clientWidth - ANIM.INITIAL_X_OFFSET, ANIM.INITIAL_Y_OFFSET)
    tiltEngine.toCenter()
    tiltEngine.beginInitial(ANIM.INITIAL_DURATION)

    return () => {
      s.removeEventListener('pointerenter', onEnter)
      s.removeEventListener('pointermove',  onMove)
      s.removeEventListener('pointerleave', onLeave)
      s.removeEventListener('click', onClick_)
      window.removeEventListener('deviceorientation', onOrientation)
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (leaveRaf.current) cancelAnimationFrame(leaveRaf.current)
      tiltEngine.cancel()
      s.classList.remove('entering')
    }
  }, [enableTilt, enableMobileTilt, tiltEngine, onEnter, onMove, onLeave, onOrientation])

  // ── Estilo inline (variáveis do card) ──────────────────────
  const cardStyle = useMemo(() => ({
    '--icon':              iconUrl ? `url("${iconUrl}")` : 'none',
    '--grain':             'none',
    '--inner-gradient':    innerGradient ?? DEFAULT_INNER_GRADIENT,
    '--behind-glow-color': behindGlowColor ?? 'rgba(26, 147, 134, 0.5)',
    '--behind-glow-size':  behindGlowSize  ?? '50%',
  }), [iconUrl, innerGradient, behindGlowColor, behindGlowSize])

  // ── Dados para o popup ─────────────────────────────────────
  const popupData = useMemo(() => {
    if (!externalUserData) return null
    const u = externalUserData
    return {
      full_name:   u.full_name,
      username:    u.username || u.email?.split('@')[0] || '',
      description: u.description,
      profession:  u.profession,
      avatar_url:  u.avatar_url,
      birthday:    u.birthday,
      created_at:  u.created_at,
      whatsapp:    u.whatsapp  || '',
      instagram:   u.instagram || '',
      linkedin:    u.linkedin  || '',
    }
  }, [externalUserData])

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-[540px] bg-slate-100 dark:bg-slate-900 rounded-lg">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    )
  }

  return (
    <>
      <div
        ref={wrapRef}
        className={`pc-card-wrapper ${className}`.trim()}
        onClick={() => setInfoOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setInfoOpen(true) } }}
        style={{ ...cardStyle, cursor: 'pointer' }}
      >
        {/* Glow atrás */}
        {behindGlowEnabled && <div className="pc-behind" />}

        <div ref={shellRef} className="pc-card-shell">
          <section className="pc-card">
            <div className="pc-inside">
              {/* Efeito holográfico + reflexo */}
              <div className="pc-shine" style={{ pointerEvents: 'none' }} />
              <div className="pc-glare" style={{ pointerEvents: 'none' }} />

              {/* Avatar + micro info bar */}
              <div className="pc-content pc-avatar-content relative">
                <img
                  className="avatar"
                  src={userData.avatarUrl}
                  alt={`${userData.name} avatar`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                {showUserInfo && (
                  <ProfileCardMicro
                    name={userData.name}
                    username={userData.handle}
                    avatarUrl={userData.avatarUrl}
                    onInfoClick={() => setInfoOpen(true)}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Popup de informações */}
      <ProfileCardInfoPopup
        open={infoOpen}
        onOpenChange={setInfoOpen}
        userData={popupData}
        currentUser={currentUser}
      />
    </>
  )
}

const ProfileCard = React.memo(ProfileCardComponent)
export default ProfileCard
```

---

## Passo 11 — Como Usar

```jsx
import ProfileCard from '@/components/profile/ProfileCard/ProfileCard'

// Dados mínimos necessários
const user = {
  full_name:   'Nome Completo',
  username:    'handle',
  profession:  'Desenvolvedor',
  description: 'Breve bio aqui.',
  avatar_url:  'https://...',
  birthday:    '1990-01-01',
  created_at:  '2025-03-12T00:00:00Z',
  whatsapp:    '+55219...',
  instagram:   '@handle',
  linkedin:    'handle',
}

function MinhaPagina() {
  return (
    <div className="flex items-start justify-center">
      <ProfileCard
        userData={user}
        currentUser={user}           // quem está vendo (para WA)
        iconUrl="https://minha-logo.png"   // ← logo do SEU projeto
        behindGlowColor="rgba(26,147,134,0.5)"  // ← cor brand do SEU projeto
        enableTilt={true}
        behindGlowEnabled={true}
      />
    </div>
  )
}
```

---

## Personalização por Projeto

| O que trocar | Onde |
|---|---|
| **Logo (efeito shine)** | prop `iconUrl` no `ProfileCard` |
| **Cor brand (glow/glare)** | `rgba(26, 147, 134, X)` em todos os CSS |
| **Cor do micro-info bar** | `bg-[rgba(13,90,80,0.8)]` em `ProfileCardMicro` |
| **Glow box-shadow do popup** | `boxShadow` inline em `ProfileCardInfoPopup` |
| **Tamanho do card** | `.pc-card` — `max-height`, `min-height` em `ProfileCardLayout.css` |
| **Gradiente interno** | prop `innerGradient` ou `DEFAULT_INNER_GRADIENT` |

---

## Resumo dos Arquivos

```
src/components/profile/ProfileCard/
├── ProfileCard.jsx             ← componente principal + tilt engine
├── ProfileCardMicro.jsx        ← barra info no rodapé do card
├── ProfileCardInfoPopup.jsx    ← dialog de informações detalhadas
└── Assets/
    ├── ProfileCard.css             ← importa os 5 abaixo
    └── StyleCss/
        ├── ProfileCardVariables.css    ← variáveis CSS
        ├── ProfileCardLayout.css       ← estrutura, tamanho
        ├── ProfileCardEffects.css      ← behind, shine, glare, inside
        ├── ProfileCardAvatar.css       ← parallax do avatar
        └── ProfileCardAnimations.css   ← keyframes
```

---

## Checklist

- [ ] Criar estrutura de pastas
- [ ] Copiar os 5 arquivos CSS
- [ ] Criar `ProfileCard.css` (só importações)
- [ ] Criar `ProfileCardMicro.jsx`
- [ ] Criar `ProfileCardInfoPopup.jsx`
- [ ] Criar `ProfileCard.jsx`
- [ ] Importar `ProfileCard.css` no `ProfileCard.jsx`
- [ ] Substituir `iconUrl` pela logo do projeto
- [ ] Substituir a cor `#1A9386` / `rgba(26,147,134,X)` pela cor brand do projeto
- [ ] Passar `userData` e `currentUser` para o componente
- [ ] Adicionar `<ProfileCard />` na página de perfil

---

## Dependências

```json
{
  "react": "^18",
  "lucide-react": "^0.400+",
  "@radix-ui/react-dialog": "^1+"
}
```
