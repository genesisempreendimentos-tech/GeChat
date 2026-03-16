# Zoom Feature — Controle de Escala Global

Implementação completa do controle de zoom/escala da aplicação via ícone de lupa no header.  
Basta seguir os passos abaixo em qualquer projeto React + Tailwind + Radix UI + Supabase.

---

## Visão Geral

| Item | Detalhe |
|---|---|
| **Ícone** | `Search` (lupa) do `lucide-react` |
| **Cor ativa** | `#1A9386` (brand teal) |
| **Faixa de zoom** | 50% → 200% (slider não-linear) |
| **Padrão** | 100% (front) = 80% (CSS real) |
| **Alvo do CSS zoom** | `#root` (não `body` nem `html`) |
| **Persistência** | `localStorage['pageZoom']` + coluna `zoom` no Supabase |
| **Portais Radix** | Corrigidos via `useRootZoom` hook |

---

## Arquitetura

```
Zoom.jsx  ──→  aplica  #root.style.zoom = (frontZoom - 20) / 100
              salva    localStorage['pageZoom']  (backup imediato)
              salva    supabase: users.zoom      (debounce 500ms)

useRootZoom.jsx  ──→  lê #root.style.zoom via MutationObserver
                       usado em tooltip, popover, dialog, select, etc.
                       corrige posicionamento de portais fora do #root

Dashboard.jsx  ──→  polling 100ms → containerHeight = (100 / zoomBack) * 100vh
                    evita que a tela fique cortada quando zoom < 100%
```

---

## Fórmula de Conversão Front/Back

```
back = front - 20     (o que é aplicado no CSS)
front = back + 20     (o que o usuário vê no painel)

Exemplos:
  front 80%  → back 60%   → CSS zoom: 0.60
  front 100% → back 80%   → CSS zoom: 0.80   ← padrão
  front 120% → back 100%  → CSS zoom: 1.00
  front 150% → back 130%  → CSS zoom: 1.30
```

**Por que esse offset?** Para que o "100%" exibido ao usuário corresponda ao layout padrão
do projeto (que foi desenhado em ~80% de zoom real).

---

## Mapeamento do Slider (não-linear)

O slider vai de `0` a `100`, mas o zoom front vai de `50%` a `200%`:

```
slider  0  →  front  50%
slider 50  →  front 100%  ← ponto médio / centro visual
slider 100 →  front 200%
```

Funções de conversão:
```js
// slider → zoomFront
function sliderToZoomFront(s) {
  if (s <= 50) return 50 + (s / 50) * 50       // 50..100
  return 100 + ((s - 50) / 50) * 100            // 100..200
}

// zoomFront → slider
function zoomFrontToSlider(z) {
  if (z <= 100) return ((z - 50) / 50) * 50     // 0..50
  return 50 + ((z - 100) / 100) * 50            // 50..100
}
```

---

## Passo 1 — SQL (Supabase)

Adicionar a coluna `zoom` à tabela `users`:

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS zoom integer DEFAULT 100;
```

---

## Passo 2 — Hook `useRootZoom`

Crie `src/hooks/useRootZoom.jsx`:

```jsx
import { useState, useEffect } from 'react'

/**
 * Lê o zoom atual aplicado no #root.
 * Retorna um número decimal (ex: 0.8 para 80%).
 */
export const useRootZoom = () => {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) { setZoom(1); return }

    const update = () => {
      const inline = root.style.zoom
      if (inline) {
        const v = parseFloat(inline)
        if (!isNaN(v) && v > 0) { setZoom(v); return }
      }

      const computed = getComputedStyle(root).zoom
      if (computed && computed !== 'normal') {
        const v = parseFloat(computed)
        if (!isNaN(v) && v > 0) { setZoom(v); return }
      }

      const cssVar = getComputedStyle(root).getPropertyValue('--app-zoom')
      if (cssVar) {
        const v = parseFloat(cssVar)
        if (!isNaN(v) && v > 0) { setZoom(v); return }
      }

      setZoom(1)
    }

    update()

    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['style'] })

    const interval = setInterval(update, 100)

    return () => {
      observer.disconnect()
      clearInterval(interval)
    }
  }, [])

  return zoom
}
```

---

## Passo 3 — Componente `ViewButtonNavbar`

Botão de ícone circular para o header, com estado ativo/inativo e animação via `framer-motion`.  
Crie `src/components/ui/ViewButtonNavbar.jsx`:

```jsx
import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

const MotionButton = motion(Button)

/**
 * Botão ícone circular para navbar.
 *
 * Props:
 *   active?   boolean           — estado ativo (cor brand)
 *   onClick   () => void
 *   Icon      React.Component   — ícone lucide
 *   className string?
 */
const ViewButtonNavbar = React.forwardRef(({
  active = false,
  onClick,
  Icon,
  className,
  ...props
}, ref) => {
  const btnClass = cn(
    'rounded-full size-10 flex items-center justify-center',
    'transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#1A9386]/40',
    'border-[3px]',
    active ? [
      'bg-[#1A9386] dark:bg-[#1A9386]',
      'text-white dark:text-white',
      'border-slate-300 dark:border-slate-700',
      'hover:bg-[#157C70] dark:hover:bg-[#157C70]',
      'hover:text-white dark:hover:text-white',
      'hover:border-slate-300 dark:hover:border-slate-700',
    ].join(' ') : [
      'bg-neutral-100 dark:bg-slate-800',
      'text-foreground dark:text-foreground',
      'border-transparent dark:border-transparent',
      'hover:bg-slate-300 dark:hover:bg-slate-600',
      'hover:text-foreground dark:hover:text-foreground',
    ].join(' '),
    className
  )

  return (
    <MotionButton
      ref={ref}
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={active}
      onClick={onClick}
      className={btnClass}
      whileTap={{ scale: 0.9, rotate: 20 }}
      {...props}
    >
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
    </MotionButton>
  )
})

ViewButtonNavbar.displayName = 'ViewButtonNavbar'
export default ViewButtonNavbar
```

> **Dependências**: `framer-motion`, `lucide-react`, `shadcn/ui Button`, `tailwindcss`

---

## Passo 4 — Componente `Zoom`

Crie `src/components/views/navbar/navbar-components/Zoom.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react'
import { ZoomOut, ZoomIn, RotateCcw, Search } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext.jsx'
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx'
import { supabase } from '@/lib/customSupabaseClient.js'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx'
import ViewButtonNavbar from '@/components/ui/ViewButtonNavbar.jsx'

const Zoom = () => {
  const { theme } = useTheme()
  const { user } = useAuth()
  const themeMode = theme === 'dark' ? 'dark' : 'white'

  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ── Conversão front ↔ back ──────────────────────────────────────
  // front 100% = back 80%  (offset de 20)
  const frontToBack = (f) => Math.max(30, Math.min(180, f - 20))
  const backToFront = (b) => Math.max(50, Math.min(200, b + 20))

  // Estado armazena o valor FRONT (o que o usuário vê)
  const [zoomLevelFront, setZoomLevelFront] = useState(100)
  const [popupPosition, setPopupPosition] = useState({ top: 0, right: 0 })
  const buttonRef  = useRef(null)
  const dropdownRef = useRef(null)

  // ── Carregar zoom salvo ─────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      let front = 100
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('users').select('zoom').eq('id', user.id).single()
          if (!error && data?.zoom) {
            front = data.zoom
          } else {
            const saved = localStorage.getItem('pageZoom')
            if (saved) front = Math.round(backToFront(parseFloat(saved)))
          }
        } catch {
          const saved = localStorage.getItem('pageZoom')
          if (saved) front = Math.round(backToFront(parseFloat(saved)))
        }
      } else {
        const saved = localStorage.getItem('pageZoom')
        if (saved) front = Math.round(backToFront(parseFloat(saved)))
      }
      setZoomLevelFront(front)
    }
    load()
  }, [user?.id])

  // ── Aplicar zoom no #root ───────────────────────────────────────
  const zoomLevelBack = frontToBack(zoomLevelFront)

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const v = zoomLevelBack / 100
    root.style.setProperty('--app-zoom', v.toString())
    root.style.zoom = v.toString()
    // Limpar zoom residual de body/html
    document.body.style.zoom = ''
    document.body.style.transform = ''
    document.documentElement.style.zoom = ''
    // Persistência local imediata
    localStorage.setItem('pageZoom', zoomLevelBack.toString())
  }, [zoomLevelBack])

  // ── Salvar no Supabase (debounce 500ms) ────────────────────────
  useEffect(() => {
    const save = async () => {
      if (!user?.id || isLoading) return
      try {
        setIsLoading(true)
        await supabase.from('users')
          .update({ zoom: zoomLevelFront })
          .eq('id', user.id)
      } catch (e) {
        console.error('Erro ao salvar zoom:', e)
      } finally {
        setIsLoading(false)
      }
    }
    const t = setTimeout(save, 500)
    return () => clearTimeout(t)
  }, [zoomLevelFront, user?.id])

  // ── Posição do popup (fixed, abaixo do botão) ──────────────────
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopupPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      })
    }
  }, [isOpen])

  // ── Fechar ao clicar fora ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current  && !buttonRef.current.contains(e.target)
      ) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // ── Classes de tema ────────────────────────────────────────────
  const tc = themeMode === 'dark'
    ? { dropdown: 'bg-slate-700 border-slate-500 text-slate-200', action: 'bg-slate-600 hover:bg-slate-500 text-slate-200' }
    : { dropdown: 'bg-slate-300 border-slate-400 text-slate-800', action: 'bg-slate-400 hover:bg-slate-500 text-slate-800' }

  // ── Handlers ──────────────────────────────────────────────────
  const clamp = (v) => Math.round(Math.max(50, Math.min(200, v)))
  const handleChange = (v) => setZoomLevelFront(clamp(v))
  const handleIn    = () => handleChange(zoomLevelFront + 10)
  const handleOut   = () => handleChange(zoomLevelFront - 10)
  const handleReset = () => setZoomLevelFront(100)

  // Mapeamento slider (0-100) ↔ zoomFront (50-200) não-linear
  const sliderToFront = (s) => s <= 50
    ? 50 + (s / 50) * 50
    : 100 + ((s - 50) / 50) * 100

  const frontToSlider = (z) => z <= 100
    ? ((z - 50) / 50) * 50
    : 50 + ((z - 100) / 100) * 50

  const handleSlider = (e) => {
    const v = Math.round(sliderToFront(parseFloat(e.target.value)))
    if (v >= 50 && v <= 200) setZoomLevelFront(v)
  }

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
          className={`fixed rounded-lg border shadow-lg z-50 ${tc.dropdown}`}
          style={{
            width: 256,
            height: 160,
            overflow: 'hidden',
            zoom: `${100 / zoomLevelBack}`,       // ← auto-corrige o zoom do popup
            top:   `${popupPosition.top}px`,
            right: `${popupPosition.right}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-full flex flex-col justify-between">

            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <h3 className="text-sm font-semibold">Zoom</h3>
              <span className="text-sm font-bold">{Math.round(zoomLevelFront)}%</span>
            </div>

            {/* Slider */}
            <div className="px-4 py-2 flex-1 flex items-center">
              <div className="w-full space-y-1">
                <input
                  type="range"
                  min="0" max="100" step="0.1"
                  value={frontToSlider(Math.round(zoomLevelFront))}
                  onChange={handleSlider}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      #1a9386 0%,
                      #1a9386 ${frontToSlider(Math.round(zoomLevelFront))}%,
                      #475569 ${frontToSlider(Math.round(zoomLevelFront))}%,
                      #475569 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>50%</span>
                  <span>100%</span>
                  <span>200%</span>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex items-center gap-1 px-4 pb-3">
              <button
                onClick={handleOut}
                disabled={zoomLevelFront <= 50}
                className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex items-center justify-center
                  ${zoomLevelFront <= 50 ? 'opacity-50 cursor-not-allowed' : tc.action}`}
                title="Diminuir"
              >
                <ZoomOut size={16} />
              </button>

              <button
                onClick={handleReset}
                className={`px-2 py-1.5 rounded-lg transition-colors ${tc.action}`}
                title="Resetar para 100%"
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={handleIn}
                disabled={zoomLevelFront >= 200}
                className={`flex-1 px-2 py-1.5 rounded-lg transition-colors flex items-center justify-center
                  ${zoomLevelFront >= 200 ? 'opacity-50 cursor-not-allowed' : tc.action}`}
                title="Aumentar"
              >
                <ZoomIn size={16} />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default Zoom
```

---

## Passo 5 — Adicionar ao Header/Navbar

No seu componente de navbar, importe e use `Zoom` (oculto em mobile via `hidden lg:flex`):

```jsx
import Zoom from './navbar-components/Zoom.jsx'

// Dentro do header, na seção de botões à direita:
<span className="hidden lg:flex">
  <Zoom />
</span>
```

> O Zoom só é exibido em telas grandes (`≥ 1024px`). Em mobile/tablet ele é ocultado
> pois o layout responsivo sobrepõe o controle de altura com `100dvh`.

---

## Passo 6 — Corrigir Portais Radix UI

Portais (`Dialog`, `Tooltip`, `Popover`, `Select`, `DropdownMenu`, `AlertDialog`) são
renderizados no `body`, **fora** do `#root`. Por isso precisam receber o zoom inverso
para se posicionar corretamente.

Em cada componente de portal do `shadcn/ui`, importe o hook e aplique no `Content`:

```jsx
import { useRootZoom } from '@/hooks/useRootZoom'

// Dentro do componente (ex: TooltipContent)
const TooltipContent = React.forwardRef(({ style, ...props }, ref) => {
  const rootZoom = useRootZoom()
  return (
    <TooltipPrimitive.Content
      ref={ref}
      style={{ zoom: rootZoom, ...style }}
      {...props}
    />
  )
})
```

**Arquivos que precisam da correção:**

| Arquivo | Componente alvo |
|---|---|
| `tooltip.jsx` | `TooltipContent` |
| `popover.jsx` | `PopoverContent` |
| `dialog.jsx` | `DialogOverlay`, `DialogContent` |
| `select.jsx` | `SelectContent` |
| `alert-dialog.jsx` | `AlertDialogOverlay`, `AlertDialogContent` |
| `dropdown-menu.jsx` | `DropdownMenuContent`, `DropdownMenuSubContent` |

---

## Passo 7 — Altura Dinâmica do Container Principal

Quando o zoom é menor que 100% o container principal fica maior que a viewport, causando
scroll indesejado. Corrija no seu layout raiz (`Dashboard.jsx` ou equivalente):

```jsx
import { useState, useEffect } from 'react'

function Dashboard() {
  const [zoomLevelBack, setZoomLevelBack] = useState(80) // padrão: front 100% = back 80%

  // Polling 100ms — lê o zoom aplicado pelo Zoom.jsx
  useEffect(() => {
    const read = () => {
      const saved = localStorage.getItem('pageZoom')
      setZoomLevelBack(Math.round(saved ? parseFloat(saved) : 80))
    }
    read()
    const id = setInterval(read, 100)
    return () => clearInterval(id)
  }, [])

  // Fórmula: (100 / zoomBack) * 100vh
  //   zoom 80% → 125vh   |   zoom 60% → 166.67vh   |   zoom 100% → 100vh
  const containerHeight = `${(100 / zoomLevelBack) * 100}vh`

  return (
    <div
      style={{
        height: containerHeight,
        minHeight: containerHeight,
        width: '100%',
        overflow: 'hidden',
      }}
    >
      {/* ... sidebar + navbar + conteúdo ... */}
    </div>
  )
}
```

---

## Passo 8 — CSS Global (`index.css`)

Adicione a variável CSS e a sobrescrição de altura em mobile:

```css
:root {
  --app-zoom: 1; /* gerenciada pelo Zoom.jsx via JS */
}

html, body {
  height: 100%;
  width: 100%;
}

#root {
  height: 100%;
  width: 100%;
}

/* Em mobile/tablet: ignorar o containerHeight calculado e usar 100dvh real */
@media (max-width: 1023px) {
  .dashboard-root {
    height: 100dvh !important;
    min-height: 100dvh !important;
  }
}
```

> Adicione a classe `dashboard-root` ao container raiz do layout para a regra mobile funcionar.

---

## Resumo dos Arquivos Criados/Modificados

```
src/
├── hooks/
│   └── useRootZoom.jsx                          ← CRIAR  (Passo 2)
├── components/
│   ├── ui/
│   │   ├── ViewButtonNavbar.jsx                 ← CRIAR  (Passo 3)
│   │   ├── tooltip.jsx                          ← EDITAR (Passo 6)
│   │   ├── popover.jsx                          ← EDITAR (Passo 6)
│   │   ├── dialog.jsx                           ← EDITAR (Passo 6)
│   │   ├── select.jsx                           ← EDITAR (Passo 6)
│   │   ├── alert-dialog.jsx                     ← EDITAR (Passo 6)
│   │   └── dropdown-menu.jsx                    ← EDITAR (Passo 6)
│   └── views/navbar/navbar-components/
│       └── Zoom.jsx                             ← CRIAR  (Passo 4)
├── pages/
│   └── Dashboard.jsx                            ← EDITAR (Passo 7)
└── index.css                                    ← EDITAR (Passo 8)
```

---

## Checklist de Implementação

- [ ] SQL: coluna `zoom integer DEFAULT 100` na tabela `users`
- [ ] Criar `useRootZoom.jsx`
- [ ] Criar `ViewButtonNavbar.jsx`
- [ ] Criar `Zoom.jsx`
- [ ] Adicionar `<Zoom />` no navbar (dentro de `hidden lg:flex`)
- [ ] Corrigir portais Radix (`tooltip`, `popover`, `dialog`, `select`, `alert-dialog`, `dropdown-menu`)
- [ ] Adicionar polling de zoom + `containerHeight` no layout raiz
- [ ] Adicionar CSS global (`--app-zoom`, regra `@media (max-width: 1023px)`)

---

## Comportamento Visual

```
┌─────────────────────────────────────────────────────────┐
│  Header  …  [🔔] [🌙] [🔍]  [avatar]                   │
│                              ↑ ícone lupa (Search)       │
└─────────────────────────────────────────────────────────┘

Ao clicar na lupa → abre dropdown (fixed, 256×160px):

┌───────────────────────┐
│  Zoom          100%   │
│ ┌─────────────────┐   │
│ │ ██████░░░░░░░░  │   │  ← slider com gradiente #1a9386
│ └─────────────────┘   │
│  50%    100%    200%   │
│  [−]    [↺]    [+]   │  ← ZoomOut | RotateCcw | ZoomIn
└───────────────────────┘

Cores do slider:
  preenchido: #1a9386 (brand teal)
  vazio:      #475569 (slate-600)

Botão lupa ativo (dropdown aberto):
  background: #1A9386
  ícone:      branco

Botão lupa inativo:
  background: bg-neutral-100 / dark:bg-slate-800
  ícone:      text-foreground
```

---

## Dependências

```json
{
  "lucide-react": "^0.400+",
  "framer-motion": "^11+",
  "@radix-ui/react-tooltip": "^1+",
  "tailwindcss": "^3+"
}
```
