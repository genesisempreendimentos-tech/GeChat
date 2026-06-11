import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionReveal } from '@/components/motion/AppMotion';

type DadosDiagnosticoCardProps = {
  messages: string[];
  motionIndex?: number;
};

export function DadosDiagnosticoCard({ messages, motionIndex = 9 }: DadosDiagnosticoCardProps) {
  if (!messages.length) return null;

  return (
    <MotionReveal index={motionIndex}>
      <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Lightbulb className="size-3.5" />
            </span>
            <div>
              <CardTitle className="text-sm">Diagnóstico rápido</CardTitle>
              <CardDescription className="text-xs">Leitura automática do período</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {messages.map((msg) => (
              <li key={msg} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{msg}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </MotionReveal>
  );
}
