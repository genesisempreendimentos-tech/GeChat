// ProfileCardInfoPopup.tsx
import React, { useState, useMemo, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Cake, Instagram, Linkedin, X, Calendar as Calendar1 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
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
    ? `Olá, me chamo ${apelido.trim()} e vim do genovo.`
    : 'Olá, vim do genovo.'
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
  const [mascoteOnRight, setMascoteOnRight] = useState(true)

  useEffect(() => {
    if (open) {
      setAvatarError(false)
      setMascoteOnRight(Math.random() < 0.5)
    }
  }, [open, userData])

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
      icon:          userData.icon ?? '',
      sectorIcon:    userData.sector_icon || '',
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
          <div className="px-6 pb-6 relative z-10">

            {/* Nome sempre centralizado sob o avatar; ícone (passaro/leao) ao lado sem deslocar o nome */}
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-white tracking-tight leading-tight truncate">
                {data.apelido || data.username || 'Usuário'}
              </h2>
              {/* @username centralizado */}
              <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
                <span className="text-teal-400 text-sm font-semibold">@{data.username}</span>
              </div>
              {data.description && (
                <p className="text-white/55 text-sm mt-2 leading-relaxed">{data.description}</p>
              )}
            </div>

            {/* Badge profissão */}
            {data.profession && (
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 font-medium text-sm">
                  {data.sectorIcon ? (
                    <img
                      src={data.sectorIcon}
                      alt=""
                      className="w-4 h-4 object-contain shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <span className="w-4 h-4 shrink-0 flex items-center justify-center text-teal-400 text-xs">◆</span>
                  )}
                  {data.profession}
                </div>
              </div>
            )}

            {/* Redes sociais centralizadas + mascote na coluna direita (não desloca o centro) */}
            {(data.whatsapp || data.instagram || data.linkedin || !!data.mascote) && (() => {
              const mascoteSrc =
                data.mascote === 'gato' ? '/assets/cat.lottie' :
                data.mascote === 'cachorro' ? '/assets/dog.lottie' :
                data.mascote === 'passaro' ? '/assets/bird.lottie' :
                data.mascote === 'terra' ? '/assets/terra.lottie' :
                data.mascote === 'tigre' ? '/assets/tigre.lottie' :
                data.mascote === 'cavalo' ? '/assets/cavalo.lottie' :
                data.mascote === 'peixe' ? '/assets/peixe.lottie' :
                data.mascote === 'leao' ? '/assets/leao.lottie' : null

              return (
                <div className="grid grid-cols-[auto_auto_auto] items-center justify-center mb-4 w-full">
                  {/* coluna esquerda */}
                  <span className="flex items-center justify-end pr-2">
                    {mascoteSrc && !mascoteOnRight ? (
                      <div className="w-24 h-24 shrink-0 pointer-events-none">
                        <DotLottiePlayer src={mascoteSrc} autoplay loop className="w-full h-full" renderer="svg" />
                      </div>
                    ) : (
                      <span className="w-24" aria-hidden />
                    )}
                  </span>

                  {/* centro: redes sociais sempre centralizadas */}
                  <TooltipProvider delayDuration={200}>
                    <div className="flex items-center justify-center gap-2">
                      {data.whatsapp && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => open_(waUrl)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366] hover:text-white hover:scale-110 transition-all duration-200"
                            >
                              <WhatsappIcon className="w-[18px] h-[18px]" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>WhatsApp</TooltipContent>
                        </Tooltip>
                      )}
                      {data.instagram && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => open_(igUrl)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#E1306C]/15 text-[#E1306C] hover:bg-[#E1306C] hover:text-white hover:scale-110 transition-all duration-200"
                            >
                              <Instagram className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>Instagram</TooltipContent>
                        </Tooltip>
                      )}
                      {data.linkedin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => open_(liUrl)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0A66C2]/15 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white hover:scale-110 transition-all duration-200"
                            >
                              <Linkedin className="w-4 h-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={6}>LinkedIn</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>

                  {/* coluna direita */}
                  <span className="flex items-center pl-2">
                    {mascoteSrc && mascoteOnRight ? (
                      <div className="w-24 h-24 shrink-0 pointer-events-none">
                        <DotLottiePlayer src={mascoteSrc} autoplay loop className="w-full h-full" renderer="svg" />
                      </div>
                    ) : (
                      <span className="w-24" aria-hidden />
                    )}
                  </span>
                </div>
              )
            })()}

            {/* Linha separadora: aniversário esquerda | admissão direita */}
            {(data.birthday || data.admissionDate) && (
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  {/* Aniversário */}
                  {data.birthday ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-white/35 leading-none">Aniversário</p>
                      <div className="flex items-center gap-1.5 text-white/55 text-sm">
                        <Cake className="w-3.5 h-3.5 text-white/35" />
                        <span>{data.birthday}</span>
                      </div>
                    </div>
                  ) : <span />}

                  {/* Data de admissão */}
                  {data.admissionDate && (
                    <div className="text-right flex flex-col gap-0.5 items-end">
                      <p className="text-xs text-white/35 leading-none">Desde</p>
                      <div className="flex items-center gap-1.5 text-white/55 text-sm">
                        <span>{data.admissionDate}</span>
                        <Calendar1 className="w-3.5 h-3.5 text-white/35" />
                      </div>
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