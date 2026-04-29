import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronRight, Sparkles } from "lucide-react"
import { useOnboardingStore } from "@/store/onboardingStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface OnboardingStep {
  title: string
  description: string
  route?: string
  targetSelector?: string
  placement?: "top" | "bottom" | "left" | "right"
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Menu principal",
    description:
      "Este é o menu lateral. Aqui você navega por todas as áreas do genovo.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"sidebar\"]',
    placement: "right",
  },
  {
    title: "Uva",
    description: "Aqui você acompanha o resumo geral da sua experiência e acessos no sistema.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-dashboard\"]',
    placement: "right",
  },
  {
    title: "Aplicativos",
    description: "Nesta seção você encontra todos os aplicativos liberados para o seu perfil.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-apps\"]',
    placement: "right",
  },
  {
    title: "Manga",
    description: "Use esta área para abrir e acompanhar suas solicitações internas.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-solicitacoes\"]',
    placement: "right",
  },
  {
    title: "Caju",
    description: "Aqui ficam os avisos e comunicados oficiais da empresa.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-comunicados\"]',
    placement: "right",
  },
  {
    title: "Pitaya",
    description: "Nesta seção você visualiza departamentos, setores e colaboradores.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-equipes\"]',
    placement: "right",
  },
  {
    title: "Coco",
    description: "Aqui estão as informações institucionais e dados gerais da organização.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-empresa\"]',
    placement: "right",
  },
  {
    title: "Pitanga",
    description: "Acesse rapidamente os aplicativos que você marcou como favoritos.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"menu-favoritos\"]',
    placement: "right",
  },
  {
    title: "Navegação superior",
    description:
      "Nesta barra superior você encontra atalhos rápidos, notificações, tema e controles gerais da plataforma.",
    route: "/dashboard",
    targetSelector: '[data-tour=\"top-nav\"]',
    placement: "bottom",
  },
  {
    title: "Perfil",
    description:
      "Agora vamos para o seu perfil. Complete as informações públicas para continuar o tour (mock).",
    route: "/dashboard",
    targetSelector: '[data-tour=\"profile-area\"]',
    placement: "left",
  },
]

type Rect = { top: number; left: number; width: number; height: number }

export function OnboardingTour() {
  const location = useLocation()
  const navigate = useNavigate()
  const {
    hasSeenOnboarding,
    currentStep,
    isOnboardingActive,
    setHasSeenOnboarding,
    setCurrentStep,
    setIsOnboardingActive,
    nextStep,
  } = useOnboardingStore()
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const [direction, setDirection] = useState(1)

  useEffect(() => {
    // Iniciar onboarding automaticamente para novos usuários
    if (!hasSeenOnboarding && !isOnboardingActive) {
      const timer = setTimeout(() => {
        setIsOnboardingActive(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [hasSeenOnboarding, isOnboardingActive, setIsOnboardingActive])

  const handleSkip = () => {
    setHasSeenOnboarding(true)
    setIsOnboardingActive(false)
    setCurrentStep(0)
  }
  const currentStepData = onboardingSteps[currentStep]
  const isLastStep = currentStep === onboardingSteps.length - 1

  useEffect(() => {
    if (!isOnboardingActive || !currentStepData) return
    if (currentStepData.route && location.pathname !== currentStepData.route) {
      navigate(currentStepData.route)
    }
  }, [currentStepData, isOnboardingActive, location.pathname, navigate])

  useEffect(() => {
    if (!isOnboardingActive || !currentStepData?.targetSelector) {
      setTargetRect(null)
      return
    }

    const updateTargetRect = () => {
      const element = document.querySelector(currentStepData.targetSelector!)
      if (!element) {
        setTargetRect(null)
        return
      }
      const rect = (element as HTMLElement).getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        setTargetRect(null)
        return
      }
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      })
    }

    updateTargetRect()
    const timer = window.setInterval(updateTargetRect, 120)
    window.addEventListener("resize", updateTargetRect)
    window.addEventListener("scroll", updateTargetRect, true)
    return () => {
      clearInterval(timer)
      window.removeEventListener("resize", updateTargetRect)
      window.removeEventListener("scroll", updateTargetRect, true)
    }
  }, [currentStepData, isOnboardingActive])

  const tooltipPosition = useMemo(() => {
    const width = 360
    const height = 230
    const gap = 16
    const viewportPadding = 16
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 720

    if (!targetRect) {
      return {
        top: Math.max(viewportPadding, (viewportHeight - height) / 2),
        left: Math.max(viewportPadding, (viewportWidth - width) / 2),
        width,
        arrow: null as null | { top?: number; left?: number; right?: number; bottom?: number; rotate: string },
      }
    }

    const placement = currentStepData?.placement ?? "right"
    let top = targetRect.top
    let left = targetRect.left
    let arrow: { top?: number; left?: number; right?: number; bottom?: number; rotate: string } | null = null

    if (placement === "right") {
      left = targetRect.left + targetRect.width + gap
      top = targetRect.top + targetRect.height / 2 - height / 2
      arrow = { left: -6, top: height / 2 - 6, rotate: "45deg" }
    } else if (placement === "left") {
      left = targetRect.left - width - gap
      top = targetRect.top + targetRect.height / 2 - height / 2
      arrow = { right: -6, top: height / 2 - 6, rotate: "45deg" }
    } else if (placement === "top") {
      left = targetRect.left + targetRect.width / 2 - width / 2
      top = targetRect.top - height - gap
      arrow = { bottom: -6, left: width / 2 - 6, rotate: "45deg" }
    } else {
      left = targetRect.left + targetRect.width / 2 - width / 2
      top = targetRect.top + targetRect.height + gap
      arrow = { top: -6, left: width / 2 - 6, rotate: "45deg" }
    }

    left = Math.min(Math.max(viewportPadding, left), viewportWidth - width - viewportPadding)
    top = Math.min(Math.max(viewportPadding, top), viewportHeight - height - viewportPadding)

    return { top, left, width, arrow }
  }, [currentStepData?.placement, targetRect])

  const handleGoToProfile = () => {
    setHasSeenOnboarding(true)
    setIsOnboardingActive(false)
    setCurrentStep(0)
    navigate("/profile?fromTour=1")
  }

  const handleNext = () => {
    setDirection(1)
    if (isLastStep) {
      handleGoToProfile()
      return
    }
    nextStep()
  }

  if (!isOnboardingActive || !currentStepData) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[110]">
      {!targetRect ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
          {(() => {
            const pad = 8
            const top = Math.max(0, targetRect.top - pad)
            const left = Math.max(0, targetRect.left - pad)
            const right = Math.min(window.innerWidth, targetRect.left + targetRect.width + pad)
            const bottom = Math.min(window.innerHeight, targetRect.top + targetRect.height + pad)
            return (
              <>
                <div className="absolute left-0 right-0 top-0 bg-black/55 backdrop-blur-[2px]" style={{ height: top }} />
                <div className="absolute left-0 right-0 bg-black/55 backdrop-blur-[2px]" style={{ top: bottom, bottom: 0 }} />
                <div className="absolute top-0 bg-black/55 backdrop-blur-[2px]" style={{ left: 0, width: left, height: window.innerHeight }} />
                <div className="absolute top-0 bg-black/55 backdrop-blur-[2px]" style={{ left: right, right: 0, height: window.innerHeight }} />
              </>
            )
          })()}
        </motion.div>
      )}

      {targetRect ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute rounded-xl border-2 border-primary/70 shadow-[0_0_0_9999px_rgba(3,7,18,0.62)]"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      ) : null}

      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 * direction }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto fixed"
            style={{
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              width: tooltipPosition.width,
            }}
          >
            <Card className="relative border-2 border-primary/40 bg-card/95 shadow-2xl backdrop-blur-xl">
              {tooltipPosition.arrow ? (
                <span
                  className="absolute h-3 w-3 border border-border/70 bg-card/95"
                  style={{
                    top: tooltipPosition.arrow.top,
                    left: tooltipPosition.arrow.left,
                    right: tooltipPosition.arrow.right,
                    bottom: tooltipPosition.arrow.bottom,
                    transform: `rotate(${tooltipPosition.arrow.rotate})`,
                  }}
                />
              ) : null}
              <CardContent className="p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Passo {currentStep + 1} de {onboardingSteps.length}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleSkip} className="h-8 w-8 p-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-lg font-semibold">{currentStepData.title}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{currentStepData.description}</p>
                </div>

                <div className="my-4 flex gap-1">
                  {onboardingSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStep ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={handleSkip}>
                    Pular tour
                  </Button>
                  <Button onClick={handleNext} className="gap-2">
                    {isLastStep ? "Ir para perfil" : "Avançar"}
                    {!isLastStep ? <ChevronRight className="h-4 w-4" /> : null}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
