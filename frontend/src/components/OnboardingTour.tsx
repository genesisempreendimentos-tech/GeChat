import { useEffect, useState } from 'react';
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
    description: 'Métricas, gráficos e filtros analíticos do GêLeads.',
    route: '/dados',
    targetSelector: '[data-tour="menu-dados"]',
    placement: 'right',
  },
  {
    title: 'Leads',
    description: 'Gestão operacional — busca, planilha, cards e resumo por lead.',
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

// Quanto esperar pelo shell (sidebar) antes de desistir de abrir o tour.
const SHELL_WAIT_TIMEOUT_MS = 15000;
const SHELL_POLL_INTERVAL_MS = 250;
const SHELL_INITIAL_DELAY_MS = 800;

type Box = { top: number; left: number; width: number; height: number };

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

export function OnboardingTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasSeenOnboarding, setHasSeenOnboarding } = useOnboardingStore();
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<Box | null>(null);

  const step = onboardingSteps[stepIndex];

  // Abre o tour só depois que o shell do app (sidebar) existe no DOM —
  // no primeiro carregamento a tela ainda está montando quando o timer dispara.
  useEffect(() => {
    if (visible || hasSeenOnboarding || location.pathname.startsWith('/login')) return;
    let cancelled = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const tryShow = () => {
      if (cancelled) return;
      if (document.querySelector('[data-tour="sidebar"]')) {
        setVisible(true);
        return;
      }
      if (Date.now() - startedAt < SHELL_WAIT_TIMEOUT_MS) {
        timer = setTimeout(tryShow, SHELL_POLL_INTERVAL_MS);
      }
    };

    timer = setTimeout(tryShow, SHELL_INITIAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, hasSeenOnboarding, location.pathname]);

  // Cada passo leva para a rota correspondente (sem renavegar se já está nela).
  useEffect(() => {
    if (!visible || !step?.route) return;
    if (location.pathname !== step.route) navigate(step.route);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stepIndex]);

  // Segue o alvo em tempo real: a sidebar anima de largura, a rota troca e o
  // elemento pode demorar a montar — medir uma única vez deixava o anel
  // ausente ou no lugar errado.
  useEffect(() => {
    if (!visible || !step?.targetSelector) {
      setRect(null);
      return;
    }
    let cancelled = false;
    let raf = 0;

    const measure = () => {
      if (cancelled) return;
      const el = document.querySelector(step.targetSelector!);
      const next = el ? el.getBoundingClientRect() : null;
      const box: Box | null = next
        ? { top: next.top, left: next.left, width: next.width, height: next.height }
        : null;
      setRect((prev) => (sameBox(prev, box) ? prev : box));
      raf = requestAnimationFrame(measure);
    };

    raf = requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [visible, stepIndex, step?.targetSelector]);

  const finish = () => {
    setVisible(false);
    setHasSeenOnboarding(true);
    setStepIndex(0);
  };

  if (!visible || hasSeenOnboarding) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
      >
        {rect ? (
          // Spotlight: escurece tudo menos o alvo (a sombra gigante faz o recorte).
          <div
            className="absolute rounded-lg ring-2 ring-primary pointer-events-none"
            style={{
              top: rect.top - 4,
              left: rect.left - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-black/50" />
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
              <button type="button" onClick={finish} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            <div className="mt-4 flex justify-end gap-2">
              {stepIndex < onboardingSteps.length - 1 ? (
                <Button onClick={() => setStepIndex((i) => i + 1)}>
                  Próximo
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={finish}>
                  Começar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
