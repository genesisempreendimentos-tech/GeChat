import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"
import { useOnboardingStore } from "@/store/onboardingStore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface OnboardingStep {
  title: string
  description: string
  targetElement?: string
  placement?: "top" | "bottom" | "left" | "right"
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: "Bem-vindo ao GêTudo! 👋",
    description:
      "Vamos fazer um tour rápido pelas principais funcionalidades da plataforma. Você pode pular este tour a qualquer momento.",
  },
  {
    title: "Busca Global",
    description:
      "Pressione Ctrl+K (ou Cmd+K no Mac) a qualquer momento para abrir a busca global. Encontre sistemas, páginas e ações rapidamente!",
  },
  {
    title: "Atalhos de Teclado",
    description:
      "Use Alt+H para Dashboard, Alt+S para Sistemas, Alt+F para Favoritos e muito mais. Pressione Shift+? para ver todos os atalhos.",
  },
  {
    title: "Dashboard Interativo",
    description:
      "Veja suas estatísticas, gráficos de atividade e acesse rapidamente seus sistemas favoritos diretamente do dashboard.",
  },
  {
    title: "Pronto para Começar!",
    description:
      "Agora você está pronto para explorar todos os sistemas disponíveis. Aproveite!",
  },
]

export function OnboardingTour() {
  const {
    hasSeenOnboarding,
    currentStep,
    isOnboardingActive,
    setHasSeenOnboarding,
    setCurrentStep,
    setIsOnboardingActive,
    nextStep,
    previousStep,
  } = useOnboardingStore()

  useEffect(() => {
    // Iniciar onboarding automaticamente para novos usuários
    if (!hasSeenOnboarding && !isOnboardingActive) {
      const timer = setTimeout(() => {
        setIsOnboardingActive(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [hasSeenOnboarding, isOnboardingActive, setIsOnboardingActive])

  const handleComplete = () => {
    setHasSeenOnboarding(true)
    setIsOnboardingActive(false)
    setCurrentStep(0)
  }

  const handleSkip = () => {
    setHasSeenOnboarding(true)
    setIsOnboardingActive(false)
    setCurrentStep(0)
  }

  const currentStepData = onboardingSteps[currentStep]
  const isLastStep = currentStep === onboardingSteps.length - 1

  if (!isOnboardingActive || !currentStepData) {
    return null
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleSkip}
      />

      {/* Onboarding Card - wrapper centralizado com flex para não conflitar com a animação */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: -20 }}
              className="w-full"
            >
          <Card className="border-2 border-primary shadow-2xl">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Passo {currentStep + 1} de {onboardingSteps.length}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mt-6 mb-4">
                <div className="flex gap-1">
                  {onboardingSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        index <= currentStep ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={previousStep}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSkip}>
                    Pular Tour
                  </Button>
                  <Button
                    onClick={isLastStep ? handleComplete : nextStep}
                    className="gap-2"
                  >
                    {isLastStep ? (
                      "Começar"
                    ) : (
                      <>
                        Próximo
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  )
}
