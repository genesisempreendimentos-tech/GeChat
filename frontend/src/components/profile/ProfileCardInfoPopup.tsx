import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Cake, Linkedin, Instagram, MessageCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { modalScaleFromFillRatio, profileDataFillRatio } from '@/lib/motionPresets';
import { useAppMotion } from '@/hooks/useAppMotion';

interface ProfileCardInfoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: {
    name?: string;
    apelido?: string;
    username?: string;
    bio?: string;
    avatar?: string;
    birthDate?: string;
    created_at?: string;
    whatsapp?: string;
    instagram?: string;
    linkedin?: string;
    department?: string;
    icon?: string;
    admissionDate?: string;
  } | null;
}

const ProfileCardInfoPopup: React.FC<ProfileCardInfoPopupProps> = ({
  open,
  onOpenChange,
  userData
}) => {
  const motionCfg = useAppMotion();

  if (!userData) return null;

  const profileFillRatio = profileDataFillRatio([
    userData.apelido,
    userData.name,
    userData.username,
    userData.bio,
    userData.avatar,
    userData.birthDate,
    userData.created_at,
    userData.whatsapp,
    userData.instagram,
    userData.linkedin,
    userData.department,
    userData.icon,
    userData.admissionDate,
  ]);
  const initialScale = modalScaleFromFillRatio(profileFillRatio);

  const parseLocalDate = (dateString: string): Date => {
    const match = String(dateString).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date(dateString);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = parseLocalDate(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const department = userData.department ?? '';
  const DepartmentIcon = User;

  const hasAvatar = userData.avatar && !userData.avatar.includes('dicebear.com');

  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[9998]"
            style={{ isolation: 'isolate' }}
          />
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none" style={{ isolation: 'isolate' }}>
            <motion.div
              initial={
                motionCfg.enabled
                  ? { opacity: 0, scale: initialScale }
                  : false
              }
              animate={
                motionCfg.enabled
                  ? { opacity: 1, scale: 1 }
                  : undefined
              }
              exit={
                motionCfg.enabled
                  ? { opacity: 0, scale: initialScale }
                  : undefined
              }
              transition={motionCfg.modalTransition}
              className="w-full max-w-md pointer-events-auto"
              style={{ transformOrigin: 'center center' }}
            >
            <div className="relative rounded-2xl shadow-2xl overflow-hidden border border-border bg-card">
              <div className="relative max-h-[90vh] overflow-y-auto">
                <div className="relative p-6 pb-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onOpenChange(false)}
                    className="absolute right-3 top-3 p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600/50 transition-colors z-10"
                    aria-label="Fechar"
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </motion.button>

                  {/* 1. Imagem de perfil */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-28 h-28 rounded-full border-2 border-border overflow-hidden bg-muted flex-shrink-0">
                      {hasAvatar ? (
                        <img
                          src={userData.avatar}
                          alt={userData.apelido || userData.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-400">
                          {(userData.apelido || userData.name)?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    {/* 2. Apelido (destaque) | 3. Username */}
                    <div className="text-center">
                      <h2 className="text-xl font-bold text-foreground">{userData.apelido || userData.name || '—'}</h2>
                      <p className="text-sm text-slate-400 mt-0.5">@{userData.username || '—'}</p>
                    </div>

                    {/* 4. Bio */}
                    {userData.bio && (
                      <p className="text-sm text-slate-300 text-center leading-relaxed max-w-sm">{userData.bio}</p>
                    )}

                    {/* 5. Departamento (pill com ícone escolhido pelo usuário em Público) */}
                    {department && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-500/40 bg-cyan-500/5">
                        <DepartmentIcon className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-cyan-200">{department}</span>
                      </div>
                    )}
                  </div>

                  {/* Linha separadora */}
                  <div className="h-px bg-slate-600/50 my-5 mx-2" />

                  {/* 6. Aniversário (esq) | 7. Redes ao centro | 8. Membro desde (dir) */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Cake className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div>
                        <div>Aniversário</div>
                        <div className="text-slate-300 font-medium">{formatShortDate(userData.birthDate)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      {userData.whatsapp && (
                        <a
                          href={`https://wa.me/${userData.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="w-5 h-5 text-green-500" />
                        </a>
                      )}
                      {userData.instagram && (
                        <a
                          href={userData.instagram.startsWith('http') ? userData.instagram : `https://instagram.com/${userData.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                          aria-label="Instagram"
                        >
                          <Instagram className="w-5 h-5 text-pink-500" />
                        </a>
                      )}
                      {userData.linkedin && (
                        <a
                          href={userData.linkedin.startsWith('http') ? userData.linkedin : `https://linkedin.com/in/${userData.linkedin.replace(/^\/|\s/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
                          aria-label="LinkedIn"
                        >
                          <Linkedin className="w-5 h-5 text-blue-400" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 text-slate-400 text-xs">
                      <div className="text-right">
                        <div>Membro desde</div>
                        <div className="text-slate-300 font-medium">{formatShortDate(userData.admissionDate ?? userData.created_at)}</div>
                      </div>
                      <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  if (!userData || typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};

export default ProfileCardInfoPopup;
