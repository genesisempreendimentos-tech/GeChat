import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import './Assets/ProfileCard.css';
import ProfileCardInfoPopup from './ProfileCardInfoPopup';
import ProfileCardMicro from './ProfileCardMicro';

const DEFAULT_INNER_GRADIENT = 'linear-gradient(145deg,#60496e8c 0%,#71C4FF44 100%)';

const ANIMATION_CONFIG = {
  INITIAL_DURATION: 1200,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
  DEVICE_BETA_OFFSET: 20,
  ENTER_TRANSITION_MS: 180
};

// Utils
const clamp = (v, min = 0, max = 100) => Math.min(Math.max(v, min), max);
const round = (v, precision = 3) => parseFloat(v.toFixed(precision));
const adjust = (v, fMin, fMax, tMin, tMax) => round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

const ProfileCardComponent = ({
  className = '',
  enableTilt = true,
  enableMobileTilt = false,
  mobileTiltSensitivity = 5,
  showUserInfo = true,
  iconUrl = 'https://qnrpiwdfmzoulnakdmxp.supabase.co/storage/v1/object/public/Interno/logogenesis.png',
  innerGradient,
  behindGlowEnabled = true,
  behindGlowColor,
  behindGlowSize,
  userData: externalUserData = null,
}) => {
  const { user: authUser } = useAuth();
  const user = externalUserData || authUser;
  
  const wrapRef = useRef(null);
  const shellRef = useRef(null);
  const enterTimerRef = useRef(null);
  const leaveRafRef = useRef(null);
  const [infoPopupOpen, setInfoPopupOpen] = useState(false);

  // Extrair dados do usuário
  const userData = useMemo(() => {
    if (!user) return null;
    
    // Se for dados externos (de outro usuário), usar diretamente da tabela users
    if (externalUserData) {
      const currentUsername = user.username || user.email?.split('@')[0] || '';
      const originalAvatarUrl = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || currentUsername)}&background=random`;
      
      return {
        name: user.full_name || user.email?.split('@')[0] || 'Usuário',
        title: user.profession || 'Membro',
        handle: currentUsername,
        status: 'Online',
        avatarUrl: originalAvatarUrl,
        instagram: user.instagram || '',
        linkedin: user.linkedin || '',
        whatsapp: user.whatsapp || '',
      };
    }
    
    // Se for o próprio usuário, usar user_metadata
    const meta = user.user_metadata || {};
    const currentUsername = meta.username || user.email?.split('@')[0] || '';
    
    const originalAvatarUrl = meta.avatar_url || user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(meta.full_name || currentUsername)}&background=random`;
    
    return {
      name: meta.full_name || user.email?.split('@')[0] || 'Usuário',
      title: meta.profession || 'Membro',
      handle: currentUsername,
      status: 'Online',
      avatarUrl: originalAvatarUrl,
      instagram: meta.instagram || '',
      linkedin: meta.linkedin || '',
      whatsapp: meta.whatsapp || '',
    };
  }, [user, externalUserData]);

  const tiltEngine = useMemo(() => {
    if (!enableTilt) return null;

    let rafId = null;
    let running = false;
    let lastTs = 0;
    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;
    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x, y) => {
      const shell = shellRef.current;
      const wrap = wrapRef.current;
      if (!shell || !wrap) return;

      const width = shell.clientWidth || 1;
      const height = shell.clientHeight || 1;
      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);
      const centerX = percentX - 50;
      const centerY = percentY - 50;

      const properties = {
        '--pointer-x': `${percentX}%`,
        '--pointer-y': `${percentY}%`,
        '--background-x': `${adjust(percentX, 0, 100, 35, 65)}%`,
        '--background-y': `${adjust(percentY, 0, 100, 35, 65)}%`,
        '--pointer-from-center': `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`,
        '--pointer-from-top': `${percentY / 100}`,
        '--pointer-from-left': `${percentX / 100}`,
        '--rotate-x': `${round(-(centerX / 5))}deg`,
        '--rotate-y': `${round(centerY / 4)}deg`
      };

      for (const [k, v] of Object.entries(properties)) wrap.style.setProperty(k, v);
    };

    const step = ts => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    return {
      setImmediate(x, y) {
        currentX = x;
        currentY = y;
        setVarsFromXY(currentX, currentY);
      },
      setTarget(x, y) {
        targetX = x;
        targetY = y;
        start();
      },
      toCenter() {
        const shell = shellRef.current;
        if (!shell) return;
        this.setTarget(shell.clientWidth / 2, shell.clientHeight / 2);
      },
      beginInitial(durationMs) {
        initialUntil = performance.now() + durationMs;
        start();
      },
      getCurrent() {
        return { x: currentX, y: currentY, tx: targetX, ty: targetY };
      },
      cancel() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        running = false;
        lastTs = 0;
      }
    };
  }, [enableTilt]);

  const getOffsets = (evt, el) => {
    const rect = el.getBoundingClientRect();
    return { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
  };

  const handlePointerMove = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;
      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerEnter = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      shell.classList.add('active');
      shell.classList.add('entering');
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = window.setTimeout(() => {
        shell.classList.remove('entering');
      }, ANIMATION_CONFIG.ENTER_TRANSITION_MS);

      const { x, y } = getOffsets(event, shell);
      tiltEngine.setTarget(x, y);
    },
    [tiltEngine]
  );

  const handlePointerLeave = useCallback(() => {
    const shell = shellRef.current;
    if (!shell || !tiltEngine) return;

    tiltEngine.toCenter();

    const checkSettle = () => {
      const { x, y, tx, ty } = tiltEngine.getCurrent();
      const settled = Math.hypot(tx - x, ty - y) < 0.6;
      if (settled) {
        shell.classList.remove('active');
        leaveRafRef.current = null;
      } else {
        leaveRafRef.current = requestAnimationFrame(checkSettle);
      }
    };
    if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    leaveRafRef.current = requestAnimationFrame(checkSettle);
  }, [tiltEngine]);

  const handleDeviceOrientation = useCallback(
    event => {
      const shell = shellRef.current;
      if (!shell || !tiltEngine) return;

      const { beta, gamma } = event;
      if (beta == null || gamma == null) return;

      const centerX = shell.clientWidth / 2;
      const centerY = shell.clientHeight / 2;
      const x = clamp(centerX + gamma * mobileTiltSensitivity, 0, shell.clientWidth);
      const y = clamp(
        centerY + (beta - ANIMATION_CONFIG.DEVICE_BETA_OFFSET) * mobileTiltSensitivity,
        0,
        shell.clientHeight
      );

      tiltEngine.setTarget(x, y);
    },
    [tiltEngine, mobileTiltSensitivity]
  );

  useEffect(() => {
    if (!enableTilt || !tiltEngine) return;

    const shell = shellRef.current;
    if (!shell) return;

    const pointerMoveHandler = handlePointerMove;
    const pointerEnterHandler = handlePointerEnter;
    const pointerLeaveHandler = handlePointerLeave;
    const deviceOrientationHandler = handleDeviceOrientation;

    shell.addEventListener('pointerenter', pointerEnterHandler);
    shell.addEventListener('pointermove', pointerMoveHandler);
    shell.addEventListener('pointerleave', pointerLeaveHandler);

    const handleClick = () => {
      if (!enableMobileTilt || location.protocol !== 'https:') return;
      const anyMotion = window.DeviceMotionEvent;
      if (anyMotion && typeof anyMotion.requestPermission === 'function') {
        anyMotion
          .requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', deviceOrientationHandler);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', deviceOrientationHandler);
      }
    };
    shell.addEventListener('click', handleClick);

    const initialX = (shell.clientWidth || 0) - ANIMATION_CONFIG.INITIAL_X_OFFSET;
    const initialY = ANIMATION_CONFIG.INITIAL_Y_OFFSET;
    tiltEngine.setImmediate(initialX, initialY);
    tiltEngine.toCenter();
    tiltEngine.beginInitial(ANIMATION_CONFIG.INITIAL_DURATION);

    return () => {
      shell.removeEventListener('pointerenter', pointerEnterHandler);
      shell.removeEventListener('pointermove', pointerMoveHandler);
      shell.removeEventListener('pointerleave', pointerLeaveHandler);
      shell.removeEventListener('click', handleClick);
      window.removeEventListener('deviceorientation', deviceOrientationHandler);
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
      tiltEngine.cancel();
      shell.classList.remove('entering');
    };
  }, [
    enableTilt,
    enableMobileTilt,
    tiltEngine,
    handlePointerMove,
    handlePointerEnter,
    handlePointerLeave,
    handleDeviceOrientation
  ]);

  const cardStyle = useMemo(
    () => ({
      '--icon': iconUrl ? `url("${iconUrl}")` : 'none',
      '--grain': 'none',
      '--inner-gradient': innerGradient ?? DEFAULT_INNER_GRADIENT,
      '--behind-glow-color': behindGlowColor ?? 'rgba(26, 147, 134, 0.5)',
      '--behind-glow-size': behindGlowSize ?? '50%'
    }),
    [iconUrl, innerGradient, behindGlowColor, behindGlowSize]
  );

  // Verificar se o ícone está carregando corretamente
  useEffect(() => {
    if (iconUrl && iconUrl !== 'none') {
      const img = new Image();
      img.onload = () => {
        // Ícone carregado
      };
      img.onerror = () => {
        console.warn('Erro ao carregar ícone:', iconUrl);
      };
      img.src = iconUrl;
    }
  }, [iconUrl]);

  const handleCardClick = () => {
    setInfoPopupOpen(true);
  };

  // Preparar dados para o popup
  const popupUserData = useMemo(() => {
    if (!user) return null;
    
    // Se for dados externos (de outro usuário), usar diretamente da tabela users
    if (externalUserData) {
      return {
        full_name: user.full_name,
        username: user.username || user.email?.split('@')[0] || '',
        description: user.description,
        profession: user.profession,
        avatar_url: user.avatar_url,
        birthday: user.birthday,
        seal_icon: user.seal_icon,
        created_at: user.created_at,
        whatsapp: user.whatsapp || '',
        instagram: user.instagram || '',
        linkedin: user.linkedin || '',
      };
    }
    
    // Se for o próprio usuário, usar user_metadata
    const meta = user.user_metadata || {};
    return {
      full_name: meta.full_name,
      username: meta.username || user.email?.split('@')[0] || '',
      description: meta.description,
      profession: meta.profession,
      avatar_url: meta.avatar_url || user.avatar_url,
      birthday: meta.birthday,
      seal_icon: meta.sealIcon || meta.seal_icon,
      created_at: user.created_at,
      whatsapp: meta.whatsapp || '',
      instagram: meta.instagram || '',
      linkedin: meta.linkedin || '',
    };
  }, [user, externalUserData]);

  if (!userData) {
    return (
      <div className="flex items-center justify-center h-[540px] bg-slate-100 dark:bg-slate-900 rounded-lg">
        <p className="text-muted-foreground">Carregando perfil...</p>
      </div>
    );
  }

  return (
    <>
      <div 
        ref={wrapRef} 
        className={`pc-card-wrapper ${className}`.trim()} 
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        style={{ ...cardStyle, cursor: 'pointer' }}
      >
        {behindGlowEnabled && <div className="pc-behind" />}
        <div ref={shellRef} className="pc-card-shell">
          <section className="pc-card">
            <div className="pc-inside">
              <div className="pc-shine" style={{ pointerEvents: 'none' }} />
              <div className="pc-glare" style={{ pointerEvents: 'none' }} />
              <div className="pc-content pc-avatar-content relative">
                <img
                  className="avatar"
                  src={userData.avatarUrl}
                  alt={`${userData.name} avatar`}
                  loading="lazy"
                  decoding="async"
                  onError={e => {
                    const t = e.target;
                    t.style.display = 'none';
                  }}
                />
                {showUserInfo && (
                  <ProfileCardMicro
                    name={userData.name}
                    username={userData.handle}
                    avatarUrl={userData.avatarUrl}
                    onInfoClick={() => setInfoPopupOpen(true)}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Popup de informações */}
      <ProfileCardInfoPopup
        open={infoPopupOpen}
        onOpenChange={setInfoPopupOpen}
        userData={popupUserData}
      />
    </>
  );
};

const ProfileCard = React.memo(ProfileCardComponent);
export default ProfileCard;