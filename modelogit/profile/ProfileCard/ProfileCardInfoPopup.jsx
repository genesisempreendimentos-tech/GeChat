import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Cake, MessageCircle, Instagram, Linkedin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getSealComp, normalizeSealId } from '@/components/views/profile/ProfileInfo/SealIcon';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';

// Helpers para construir URLs
const digitsOnly = (val) => (val || '').replace(/\D+/g, '');
const buildInstagramUrl = (raw) => {
  if (!raw) return '';
  let v = String(raw).trim();
  try {
    if (v.startsWith('http')) return v;
    if (v.startsWith('@')) v = v.slice(1);
    v = v.replace(/^\/+|\/+$/g, '');
    return `https://www.instagram.com/${v}/`;
  } catch { return ''; }
};
const buildLinkedinUrl = (raw) => {
  if (!raw) return '';
  const v = String(raw).trim();
  if (v.startsWith('http')) return v;
  return `https://www.linkedin.com/in/${v.replace(/^in\//, '').replace(/^@/, '')}`;
};
const buildWhatsappUrl = (rawWhats, fullName, username) => {
  if (!rawWhats) return '';
  const phone = digitsOnly(rawWhats);
  if (!phone) return '';
  const displayName = fullName?.trim() || username || 'usuário';
  const msg = `Olá, sou o ${displayName} e vim do GêTask!`;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(msg)}`;
};

export default function ProfileCardInfoPopup({ 
  open, 
  onOpenChange, 
  userData 
}) {
  const [avatarError, setAvatarError] = useState(false);
  // ✅ Obter dados do usuário logado para usar na mensagem do WhatsApp
  const { user: authUser } = useAuth();
  const [currentUserData, setCurrentUserData] = useState(null);

  // ✅ Buscar dados completos do usuário logado da tabela users
  useEffect(() => {
    if (!authUser?.id) return;

    const fetchCurrentUser = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, username')
        .eq('id', authUser.id)
        .single();

      if (!error && data) {
        setCurrentUserData(data);
      }
    };

    fetchCurrentUser();
  }, [authUser?.id]);

  // Extrair dados do usuário
  const profileData = useMemo(() => {
    if (!userData) return null;

    const sealIcon = normalizeSealId(userData.seal_icon || userData.sealIcon || 'briefcase');
    const SealIconComp = getSealComp(sealIcon);

    // Formatar data de aniversário
    let birthdayFormatted = null;
    if (userData.birthday) {
      try {
        const dateStr = String(userData.birthday).trim();
        const isoMatch = dateStr.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
        const brMatch = dateStr.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
        
        let date;
        if (isoMatch) {
          const [, y, m, d] = isoMatch;
          // Criar data no timezone local para evitar problemas de UTC
          date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else if (brMatch) {
          const [, d, m, y] = brMatch;
          // Criar data no timezone local para evitar problemas de UTC
          date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else {
          date = new Date(dateStr);
        }

        if (!isNaN(date.getTime())) {
          birthdayFormatted = format(date, 'dd/MM/yyyy', { locale: ptBR });
        }
      } catch (e) {
        console.warn('Erro ao formatar aniversário:', e);
      }
    }

    // Formatar data de criação (membro desde)
    let memberSinceFormatted = null;
    if (userData.created_at) {
      try {
        const date = new Date(userData.created_at);
        if (!isNaN(date.getTime())) {
          memberSinceFormatted = format(date, 'dd/MM/yyyy', { locale: ptBR });
        }
      } catch (e) {
        console.warn('Erro ao formatar data de criação:', e);
      }
    }

    return {
      name: userData.full_name || userData.name || 'Usuário',
      username: userData.username || userData.handle || '',
      description: userData.description || '',
      profession: userData.profession || userData.title || '',
      avatarUrl: userData.avatar_url || userData.avatarUrl || '',
      birthday: birthdayFormatted,
      memberSince: memberSinceFormatted,
      SealIconComp,
      whatsapp: userData.whatsapp || '',
      instagram: userData.instagram || '',
      linkedin: userData.linkedin || '',
    };
  }, [userData]);

  if (!profileData) return null;

  const { name, username, description, profession, avatarUrl, birthday, memberSince, SealIconComp, whatsapp, instagram, linkedin } = profileData;

  // ✅ Obter nome do usuário logado (quem está enviando a mensagem)
  const currentUserName = useMemo(() => {
    // Priorizar dados da tabela users, depois auth user, depois fallback
    return currentUserData?.full_name?.trim() || 
           currentUserData?.username || 
           authUser?.user_metadata?.full_name?.trim() ||
           authUser?.email?.split('@')[0] || 
           'usuário';
  }, [currentUserData, authUser]);

  const currentUserUsername = useMemo(() => {
    return currentUserData?.username || authUser?.email?.split('@')[0] || '';
  }, [currentUserData, authUser]);

  // Construir URLs das redes sociais
  // ✅ Usar o nome do usuário logado na mensagem do WhatsApp, não o nome do perfil visualizado
  const whatsappUrl = useMemo(() => buildWhatsappUrl(whatsapp, currentUserName, currentUserUsername), [whatsapp, currentUserName, currentUserUsername]);
  const instagramUrl = useMemo(() => buildInstagramUrl(instagram), [instagram]);
  const linkedinUrl = useMemo(() => buildLinkedinUrl(linkedin), [linkedin]);

  const handleSocialClick = (type) => {
    let url = '';
    switch (type) {
      case 'whatsapp':
        url = whatsappUrl;
        break;
      case 'instagram':
        url = instagramUrl;
        break;
      case 'linkedin':
        url = linkedinUrl;
        break;
      default:
        return;
    }
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Reset avatar error quando o popup abrir ou userData mudar
  useEffect(() => {
    if (open) {
      setAvatarError(false);
    }
  }, [open, userData]);

  // Atualizar neon effect baseado no tema
  const [neonStyle, setNeonStyle] = useState({
    boxShadow: '0 0 20px rgba(26, 147, 134, 0.4), 0 0 40px rgba(26, 147, 134, 0.2)'
  });

  useEffect(() => {
    const updateNeonStyle = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setNeonStyle({
        boxShadow: isDark 
          ? '0 0 20px rgba(26, 147, 134, 0.4), 0 0 40px rgba(26, 147, 134, 0.2)'
          : '0 0 20px rgba(26, 147, 134, 0.3), 0 0 40px rgba(26, 147, 134, 0.15)'
      });
    };

    // Atualizar inicialmente
    updateNeonStyle();

    // Observar mudanças na classe dark
    const observer = new MutationObserver(updateNeonStyle);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md p-0 overflow-visible rounded-xl" 
        showCloseButton={true}
        style={neonStyle}
      >
        {/* Título e descrição para acessibilidade (ocultos visualmente) */}
        <DialogTitle className="sr-only">
          Informações de Perfil - {name}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Popup com informações detalhadas do perfil do usuário {name}, incluindo foto, nome, username, descrição, profissão, aniversário e redes sociais.
        </DialogDescription>

        <div className="relative bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white overflow-hidden rounded-xl">
          {/* Conteúdo do popup */}
          <div className="pt-6 pb-6 px-6">
            {/* Foto do usuário */}
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-200 dark:border-slate-700 shadow-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                {!avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={`${name} avatar`}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="text-3xl font-bold text-slate-600 dark:text-slate-300">
                    {name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Nome do usuário */}
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{name}</h2>
            </div>

            {/* Username */}
            <div className="text-center mb-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm">@{username}</p>
            </div>

            {/* Descrição */}
            {description && (
              <div className="text-center mb-4 px-4">
                <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">{description}</p>
              </div>
            )}

            {/* Profissão */}
            {profession && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 dark:bg-teal-500/20 border border-teal-300 dark:border-teal-400/30 rounded-full">
                  <SealIconComp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-teal-700 dark:text-teal-300 font-medium text-sm">{profession}</span>
                </div>
              </div>
            )}

            {/* Rodapé com aniversário, membro desde e redes sociais */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-3 items-center gap-4">
                {/* Aniversário */}
                <div className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                  {birthday && (
                    <span className="text-sm text-slate-700 dark:text-slate-300">{birthday}</span>
                  )}
                </div>

                {/* Botões de Redes Sociais - Sempre Centralizados */}
                <div className="flex items-center gap-3 justify-center">
                  {whatsapp && (
                    <button
                      onClick={() => handleSocialClick('whatsapp')}
                      className="transition-all hover:scale-110"
                      title="WhatsApp"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5 text-green-500" />
                    </button>
                  )}
                  {instagram && (
                    <button
                      onClick={() => handleSocialClick('instagram')}
                      className="transition-all hover:scale-110"
                      title="Instagram"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-5 h-5 text-pink-500" />
                    </button>
                  )}
                  {linkedin && (
                    <button
                      onClick={() => handleSocialClick('linkedin')}
                      className="transition-all hover:scale-110"
                      title="LinkedIn"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5 text-blue-500" />
                    </button>
                  )}
                </div>

                {/* Membro desde */}
                <div className="text-right">
                  {memberSince ? (
                    <>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">
                        Membro desde
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                        {memberSince}
                      </p>
                    </>
                  ) : (
                    <div></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
