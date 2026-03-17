// ProfileCardInfoPopup.tsx
import React, { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Cake, Instagram, Linkedin, X } from 'lucide-react'
import { WhatsappIcon } from '@/components/icons/WhatsappIcon'
import { DotLottiePlayer } from '@dotlottie/react-player'
import '@dotlottie/react-player/dist/index.css'

// Helpers para construir URLs sociais
const digitsOnly   = (v: string) => (v || '').replace(/\D+/g, '')
const buildIG      = (v: string) => {
  if (!v) return ''
  v = String(v).trim()
  if (v.startsWith('http')) return v
  if (v.startsWith('@')) v = v.slice(1)
  return `https://www.instagram.com/${v.replace(/^\/+|\/+$/g, '')}/`
}
const buildLI      = (v: string) => {
  if (!v) return ''
  v = String(v).trim()
  return v.startsWith('http') ? v : `https://www.linkedin.com/in/${v.replace(/^in\/|^@/, '')}`
}
const buildWA = (rawWA: string, apelido: string) => {
  const phone = digitsOnly(rawWA)
  if (!phone) return ''
  const text = apelido?.trim()
    ? `Olá, me chamo ${apelido.trim()} e vim do GêApps.`
    : 'Olá, vim do GêApps.'
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
}

// Formatar data
const formatDate = (raw: string) => {
  if (!raw) return null
  try {
    const s = String(raw).trim()
    const iso = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/)
    const br  = s.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/)
    let d: Date | undefined
    if (iso) d = new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]))
    else if (br) d = new Date(parseInt(br[3]), parseInt(br[2]) - 1, parseInt(br[1]))
    else d = new Date(s)
    if (!d || isNaN(d.getTime())) return null
    return d.toLocaleDateString('pt-BR')
  } catch { return null }
}

interface ProfileCardInfoPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: any;
  currentUser: any;
}

export default function ProfileCardInfoPopup({ open, onOpenChange, userData, currentUser }: ProfileCardInfoPopupProps) {
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => { if (open) setAvatarError(false) }, [open, userData])

  const data = useMemo(() => {
    if (!userData) return null
    return {
      name:          userData.full_name || userData.name || 'Usuário',
      apelido:       userData.apelido || '',
      username:      userData.username  || userData.handle || '',
      description:   userData.description || userData.bio || '',
      profession:    userData.profession  || userData.title || userData.cadeira_principal || '',
      avatarUrl:     userData.avatar_url  || userData.avatarUrl || userData.avatar || '',
      bannerUrl:     userData.banner_url  || userData.bannerUrl || '',
      birthday:      formatDate(userData.birthday || userData.birthDate || userData.birth_date),
      admissionDate: formatDate(userData.admissionDate || userData.hire_date),
      whatsapp:      userData.whatsapp  || '',
      instagram:     userData.instagram || '',
      linkedin:      userData.linkedin  || '',
      mascote:       (userData.mascote as 'gato' | 'cachorro' | 'passaro' | 'terra' | 'tigre' | 'cavalo' | 'peixe' | 'leao') || '',
    }
  }, [userData])

  const currentUserApelido = currentUser?.apelido || currentUser?.name || currentUser?.full_name || currentUser?.username || currentUser?.email?.split('@')[0] || ''

  if (!data) return null

  const waUrl = buildWA(data.whatsapp, currentUserApelido)
  const igUrl = buildIG(data.instagram)
  const liUrl = buildLI(data.linkedin)

  const open_ = (url: string) => url && window.open(url, '_blank', 'noopener,noreferrer')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm p-0 overflow-visible rounded-2xl border-0"
        style={{ boxShadow: '0 0 24px rgba(26,147,134,0.35), 0 0 48px rgba(26,147,134,0.15)' }}
      >
        <DialogTitle className="sr-only">Perfil — {data.apelido || data.username}</DialogTitle>
        <DialogDescription className="sr-only">Informações de {data.apelido || data.username}</DialogDescription>

        <div className="relative text-card-foreground overflow-hidden rounded-2xl border border-border/40 bg-[#0d1b2a]">

          {/* Botão fechar */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 z-50 p-1.5 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Banner topo: imagem do perfil (reduzida) ou gradiente */}
          <div className="h-28 relative overflow-hidden bg-gradient-to-br from-teal-600/60 via-teal-500/30 to-transparent">
            {data.bannerUrl ? (
              <>
                <img
                  src={data.bannerUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-blue-600/20" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 to-blue-600/20" />
            )}
          </div>

          {/* Avatar sobreposto ao banner */}
          <div className="flex justify-center -mt-14 mb-3 relative z-10">
            <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-[#0d1b2a] shadow-xl bg-muted shrink-0">
              {!avatarError ? (
                <img
                  src={data.avatarUrl}
                  alt={data.apelido || data.username}
                  className="w-full h-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground bg-muted">
                  {(data.apelido || data.username || 'U').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Info — apenas apelido + username (relative para posicionar mascotes) */}
          <div className="px-6 pb-6 relative z-10 min-h-[140px]">

            {/* Mascote ao lado do nome (passaro, leao): um pouco acima e à direita */}
            <div className="text-center mb-4 relative">
              {(data.mascote === 'passaro' || data.mascote === 'leao') && (
                <div className="absolute -top-2 right-1/4 w-12 h-12 pointer-events-none" style={{ transform: 'translate(8px, -4px)' }}>
                  <DotLottiePlayer
                    src={data.mascote === 'leao' ? '/assets/leao.lottie' : '/assets/bird.lottie'}
                    autoplay
                    loop
                    className="w-full h-full"
                    renderer="svg"
                  />
                </div>
              )}
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight">
                {data.apelido || data.username || 'Usuário'}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <span className="text-teal-400 text-sm font-semibold">@{data.username}</span>
              </div>
              {data.description && (
                <p className="text-white/55 text-sm mt-2 leading-relaxed">{data.description}</p>
              )}
            </div>

            {/* Mascote canto esquerdo: gato, terra, cavalo */}
            {(data.mascote === 'gato' || data.mascote === 'terra' || data.mascote === 'cavalo') && (
              <div className="absolute bottom-4 left-4 w-20 h-20 pointer-events-none z-0 opacity-90">
                <DotLottiePlayer
                  src={
                    data.mascote === 'gato' ? '/assets/cat.lottie' :
                    data.mascote === 'terra' ? '/assets/terra.lottie' : '/assets/cavalo.lottie'
                  }
                  autoplay
                  loop
                  className="w-full h-full"
                  renderer="svg"
                />
              </div>
            )}
            {/* Mascote canto direito: cachorro, tigre, peixe (tigre um pouco maior) */}
            {(data.mascote === 'cachorro' || data.mascote === 'tigre' || data.mascote === 'peixe') && (
              <div className={`absolute bottom-4 right-4 pointer-events-none z-0 opacity-90 ${data.mascote === 'tigre' ? 'w-28 h-28' : 'w-20 h-20'}`}>
                <DotLottiePlayer
                  src={
                    data.mascote === 'cachorro' ? '/assets/dog.lottie' :
                    data.mascote === 'tigre' ? '/assets/tigre.lottie' : '/assets/peixe.lottie'
                  }
                  autoplay
                  loop
                  className="w-full h-full"
                  renderer="svg"
                />
              </div>
            )}

            {/* Badge profissão */}
            {data.profession && (
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-medium text-sm">
                  <span className="text-teal-400">👤</span>
                  {data.profession}
                </div>
              </div>
            )}

            {/* Redes sociais centralizadas */}
            {(data.whatsapp || data.instagram || data.linkedin) && (
              <div className="flex items-center justify-center gap-2 mb-4">
                {data.whatsapp && (
                  <button
                    onClick={() => open_(waUrl)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white hover:scale-110 transition-all duration-200"
                    title="WhatsApp"
                  >
                    <WhatsappIcon className="w-[18px] h-[18px]" />
                  </button>
                )}
                {data.instagram && (
                  <button
                    onClick={() => open_(igUrl)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#E1306C]/15 text-[#E1306C] hover:bg-[#E1306C] hover:text-white hover:scale-110 transition-all duration-200"
                    title="Instagram"
                  >
                    <Instagram className="w-4 h-4" />
                  </button>
                )}
                {data.linkedin && (
                  <button
                    onClick={() => open_(liUrl)}
                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0A66C2]/15 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white hover:scale-110 transition-all duration-200"
                    title="LinkedIn"
                  >
                    <Linkedin className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* Linha separadora: aniversário esquerda | admissão direita */}
            {(data.birthday || data.admissionDate) && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  {/* Aniversário */}
                  <div>
                    {data.birthday ? (
                      <div className="flex items-center gap-1.5 text-white/55 text-sm">
                        <Cake className="w-3.5 h-3.5 text-white/35" />
                        <span>{data.birthday}</span>
                      </div>
                    ) : <span />}
                  </div>

                  {/* Data de admissão */}
                  {data.admissionDate && (
                    <div className="text-right">
                      <p className="text-xs text-white/35 leading-none">Desde</p>
                      <p className="text-sm font-semibold text-white/65 mt-0.5">{data.admissionDate}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}