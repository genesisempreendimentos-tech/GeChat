import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface OnboardingStep {
  title: string;
  description: string;
  route?: string;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Menu principal',
    description: 'Navegue entre Dashboard, Análise, Leads e Relatórios pelo menu lateral.',
    route: '/dashboard',
    targetSelector: '[data-tour="sidebar"]',
    placement: 'right',
  },
  {
    title: 'Dashboard',
    description: 'Visão geral do workspace — KPIs, gráficos e atalhos rápidos.',
    route: '/dashboard',
    targetSelector: '[data-tour="menu-dashboard"]',
    placement: 'right',
  },
  {
    title: 'Análise',
    description: 'M?tricas, gr?ficos e filtros anal?ticos do G?Site.',
    route: '/dados',
    targetSelector: '[data-tour="menu-dados"]',
    placement: 'right',
  },
  {
    title: 'Leads',
    description: 'Gest?o operacional ? busca, planilha, cards e resumo por lead.',
    route: '/leads',
    targetSelector: '[data-tour="menu-leads"]',
    placement: 'right',
  },
  {
    title: 'Relatórios',
    description: 'Exportações, resumos periódicos e documentos consolidados.',
    route: '/relatorios',
    targetSelector: '[data-tour="menu-relatorios"]',
    placement: 'right',
  },
];

export function OnboardingTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasSeenOnboarding, setHasSeenOnboarding } = useOnboardingStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const step = onboardingSteps[stepIndex];

  useEffect(() => {
    if (!hasSeenOnboarding && !location.pathname.startsWith('/login')) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, [hasSeenOnboarding, location.pathname]);

  useEffect(() => {
    if (step?.route && visible) navigate(step.route);
  }, [stepIndex, visible, step?.route, navigate]);

  const rect = useMemo(() => {
    if (!step?.targetSelector || typeof document === 'undefined') return null;
    const el = document.querySelector(step.targetSelector);
    if (!el) return null;
    return el.getBoundingClientRect();
  }, [step, location.pathname, visible]);

  if (!visible || hasSeenOnboarding) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        <div className="absolute inset-0 bg-black/50" />
        {rect && (
          <div
            className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background pointer-events-none"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
            }}
          />
        )}
        <Card className="absolute bottom-6 left-1/2 z-[101] w-[min(92vw,400px)] -translate-x-1/2 shadow-xl">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-medium">
                  {stepIndex + 1} de {onboardingSteps.length}
                </span>
              </div>
              <button type="button" onClick={() => { setVisible(false); setHasSeenOnboarding(true); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            <div className="mt-4 flex justify-end gap-2">
              {stepIndex < onboardingSteps.length - 1 ? (
                <Button onClick={() => setStepIndex((i) => i + 1)}>
                  Pr?ximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => { setVisible(false); setHasSeenOnboarding(true); }}>
                  Come?ar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
