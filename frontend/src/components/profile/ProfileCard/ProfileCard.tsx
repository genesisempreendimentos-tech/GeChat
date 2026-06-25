// ProfileCard.tsx
import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react'
import './Assets/ProfileCard.css'
import ProfileCardInfoPopup from './ProfileCardInfoPopup'
import ProfileCardMicro from './ProfileCardMicro'

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
const clamp  = (v: number, mn = 0, mx = 100) => Math.min(Math.max(v, mn), mx)
const round  = (v: number, p = 3) => parseFloat(v.toFixed(p))
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number) =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin))

interface ProfileCardProps {
  className?: string;
  enableTilt?: boolean;
  enableMobileTilt?: boolean;
  mobileTiltSensitivity?: number;
  showUserInfo?: boolean;
  iconUrl?: string;
  innerGradient?: string;
  behindGlowEnabled?: boolean;
  behindGlowColor?: string;
  behindGlowSize?: string;
  userData?: any;
  currentUser?: any;
}

// ── Componente ───────────────────────────────────────────────
const ProfileCardComponent = ({
  className = '',
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  showUserInfo = true,
  iconUrl = '/assets/GeNovo.png',
  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,
  behindGlowSize,
  userData: externalUserData = null,
  currentUser = null,
}: ProfileCardProps) => {
  const wrapRef    = useRef<HTMLDivElement>(null)
  const shellRef   = useRef<HTMLDivElement>(null)
  const enterTimer = useRef<NodeJS.Timeout | null>(null)
  const leaveRaf   = useRef<number | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)

  // ── Extrair dados do usuário ────────────────────────────────
  const userData = useMemo(() => {
    if (!externalUserData) return null
    const u = externalUserData
    const username  = u.username  || u.email?.split('@')[0] || ''
    const avatarUrl = u.avatar_url || u.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.full_name || u.name || username)}`
    const displayName = u.apelido || u.full_name || u.name || username || 'Usuário'
    return {
      name:      u.full_name || u.name || u.email?.split('@')[0] || 'Usuário',
      displayName,
      title:     u.profession || u.jobTitle || 'Membro',
      handle:    username,
      avatarUrl,
      apelido:   u.apelido || '',
      icon:      u.icon ?? u.iconUrl ?? null,
      instagram: u.instagram || '',
      linkedin:  u.linkedin  || '',
      whatsapp:  u.whatsapp  || '',
    }
  }, [externalUserData])

  // ── Tilt engine (rAF loop com spring tau) ──────────────────
  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null

    let rafId: number | null = null, running = false, lastTs = 0
    let cx = 0, cy = 0, tx = 0, ty = 0
    const DEFAULT_TAU = 0.14, INITIAL_TAU = 0.6
    let initialUntil = 0

    const setVars = (x: number, y: number) => {
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
      })) {
        wrap.style.setProperty(k, v)
      }
    }

    const step = (ts: number) => {
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
      setImmediate(x: number, y: number) { cx = x; cy = y; setVars(cx, cy) },
      setTarget(x: number, y: number)    { tx = x; ty = y; start() },
      toCenter()         { const s = shellRef.current; if (s) this.setTarget(s.clientWidth / 2, s.clientHeight / 2) },
      beginInitial(ms: number)   { initialUntil = performance.now() + ms; start() },
      getCurrent()       { return { x: cx, y: cy, tx, ty } },
      cancel()           { if (rafId) cancelAnimationFrame(rafId); rafId = null; running = false; lastTs = 0 },
    }
  }, [enableTilt])

  // ── Event handlers ─────────────────────────────────────────
  const getOffsets = (e: React.PointerEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const onMove  = useCallback((e: any) => {
    const s = shellRef.current; if (!s || !tiltEngine) return
    const { x, y } = getOffsets(e, s); tiltEngine.setTarget(x, y)
  }, [tiltEngine])

  const onEnter = useCallback((e: any) => {
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

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
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

    s.addEventListener('pointerenter', onEnter as any)
    s.addEventListener('pointermove',  onMove as any)
    s.addEventListener('pointerleave', onLeave as any)

    const onClick_ = () => {
      if (!enableMobileTilt || window.location.protocol !== 'https:') return
      const A = (window as any).DeviceMotionEvent
      if (A && typeof A.requestPermission === 'function') {
        A.requestPermission().then((st: string) => {
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
      s.removeEventListener('pointerenter', onEnter as any)
      s.removeEventListener('pointermove',  onMove as any)
      s.removeEventListener('pointerleave', onLeave as any)
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
  } as React.CSSProperties), [iconUrl, innerGradient, behindGlowColor, behindGlowSize])

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-[540px] bg-slate-100 dark:bg-slate-900 rounded-xl w-full">
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

        <div ref={shellRef} className="pc-card-shell w-full max-w-[380px] lg:max-w-none">
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
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                />
                {showUserInfo && (
                  <ProfileCardMicro
                    displayName={userData.displayName}
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
        userData={externalUserData}
        currentUser={currentUser}
      />
    </>
  )
}

const ProfileCard = React.memo(ProfileCardComponent)
export default ProfileCard