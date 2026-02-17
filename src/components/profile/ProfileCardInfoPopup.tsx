import React from 'react';
import { X, Calendar, Briefcase, Linkedin, Instagram, MessageCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfileCardInfoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: {
    name?: string;
    username?: string;
    bio?: string;
    profession?: string;
    avatar?: string;
    birthDate?: string;
    created_at?: string;
    whatsapp?: string;
    instagram?: string;
    linkedin?: string;
  } | null;
}

const ProfileCardInfoPopup: React.FC<ProfileCardInfoPopupProps> = ({
  open,
  onOpenChange,
  userData
}) => {
  if (!userData) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Não informado';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const hasAvatar = userData.avatar && !userData.avatar.includes('dicebear.com');

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop com blur mais intenso */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25 
              }}
              className="w-full max-w-md pointer-events-auto"
            >
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-primary/20">
              {/* Efeito de brilho de fundo animado */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 animate-pulse" />
              
              {/* Partículas decorativas */}
              <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"
                />
                <motion.div
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.2, 0.5, 0.2],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                  className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/15 rounded-full blur-3xl"
                />
              </div>

              <div className="relative max-h-[90vh] overflow-y-auto">
                {/* Header com Avatar Grande */}
                <div className="relative p-8 pb-8">
                  {/* Botão Close */}
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onOpenChange(false)}
                    className="absolute right-4 top-4 p-2 rounded-full bg-slate-700/50 hover:bg-slate-600/50 backdrop-blur-sm border border-slate-600/50 transition-colors z-10"
                  >
                    <X className="w-5 h-5 text-slate-200" />
                  </motion.button>

                  <div className="flex flex-col items-center gap-4">
                    {/* Avatar com animação */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        damping: 15,
                        delay: 0.1
                      }}
                      className="relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/50 to-primary/30 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-32 h-32 rounded-full border-4 border-primary shadow-2xl shadow-primary/50 overflow-hidden bg-primary/10">
                        {hasAvatar ? (
                          <motion.img
                            initial={{ opacity: 0, scale: 1.2 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            src={userData.avatar}
                            alt={userData.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-primary">
                            {userData.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                    </motion.div>

                    {/* Nome e Username */}
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-center"
                    >
                      <h2 className="text-3xl font-bold text-white flex items-center gap-2 justify-center">
                        {userData.name}
                        <Sparkles className="w-6 h-6 text-primary" />
                      </h2>
                      <p className="text-base text-slate-400 mt-1.5">@{userData.username}</p>
                    </motion.div>
                  </div>
                </div>

                {/* Divider com gradiente */}
                <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mx-6" />

                {/* Content */}
                <div className="p-6 space-y-5">
                  {/* Bio - centralizada */}
                  {userData.bio && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-center"
                    >
                      <p className="text-slate-300 text-base leading-relaxed">{userData.bio}</p>
                    </motion.div>
                  )}

                  {/* Profession Badge */}
                  {userData.profession && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.35 }}
                      className="flex justify-center"
                    >
                      <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/30">
                        <Briefcase className="w-5 h-5 text-primary" />
                        <span className="text-base font-medium text-white">{userData.profession}</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Birthday */}
                  {userData.birthDate && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-3 bg-slate-800/30 backdrop-blur-sm rounded-lg p-3 border border-slate-700/30"
                    >
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{formatDate(userData.birthDate)}</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Social Links - Ícones grandes lado a lado */}
                  {(userData.instagram || userData.whatsapp) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="flex gap-3 justify-center pt-2"
                    >
                      {userData.whatsapp && (
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={`https://wa.me/${userData.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 rounded-full bg-slate-800/50 border border-slate-700/50 hover:border-green-500/50 transition-all"
                        >
                          <MessageCircle className="w-7 h-7 text-green-500" />
                        </motion.a>
                      )}
                      {userData.instagram && (
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={userData.instagram.startsWith('http') ? userData.instagram : `https://instagram.com/${userData.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-4 rounded-full bg-slate-800/50 border border-slate-700/50 hover:border-pink-500/50 transition-all"
                        >
                          <Instagram className="w-7 h-7 text-pink-500" />
                        </motion.a>
                      )}
                    </motion.div>
                  )}

                  {/* Member since - no canto inferior direito */}
                  {userData.created_at && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex justify-end pt-4 border-t border-slate-700/30"
                    >
                      <p className="text-xs text-slate-400">
                        Membro desde <span className="text-slate-300 font-medium">{formatDate(userData.created_at)}</span>
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProfileCardInfoPopup;
