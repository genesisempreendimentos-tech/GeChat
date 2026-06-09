import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { GESITE_QUALIFICACAO_ACCENT, GESITE_QUALIFICACAO_EMOJI } from '@/lib/gesiteLeadQualificacaoEmoji';
import { getGesiteLeadPontuacao } from '@/lib/gesiteLeadsMetrics';
import type { GesiteLeadQualificacao } from '@/rules/qualifyGesiteLead';

type Props = {
  qualificacao: GesiteLeadQualificacao;
  className?: string;
};

export function GesiteLeadQualificacaoEmojiTooltip({ qualificacao, className }: Props) {
  const emoji = GESITE_QUALIFICACAO_EMOJI[qualificacao];
  const accent = GESITE_QUALIFICACAO_ACCENT[qualificacao];
  const pontuacao = getGesiteLeadPontuacao(qualificacao);

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex min-w-[2.75rem] items-center justify-center rounded-xl border px-2 py-1',
            accent.border,
            accent.bg,
            'transition-all duration-200 hover:brightness-110',
            'hover:shadow-[0_0_12px_rgba(20,184,166,0.12)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            accent.ring,
            className,
          )}
          aria-label={`${emoji.label} · pontuação ${pontuacao}`}
        >
          <span className="text-sm font-bold tabular-nums leading-none text-foreground">{pontuacao}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className={cn(
          'border-primary/30 bg-[#111] px-3.5 py-1.5 text-xs font-normal text-[#c8f5f0]',
          'shadow-[0_8px_24px_rgba(0,0,0,0.5),0_0_16px_rgba(20,184,166,0.08)]',
        )}
      >
        <p>
          {emoji.label} · pontuação {pontuacao}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
