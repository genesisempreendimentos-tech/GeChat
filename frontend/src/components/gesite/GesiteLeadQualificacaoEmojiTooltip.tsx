import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { NotoEmoji } from '@/components/leads/NotoEmoji';
import { cn } from '@/lib/utils';
import { GESITE_QUALIFICACAO_EMOJI } from '@/lib/gesiteLeadQualificacaoEmoji';
import type { GesiteLeadQualificacao } from '@/rules/qualifyGesiteLead';

type Props = {
  qualificacao: GesiteLeadQualificacao;
  className?: string;
};

export function GesiteLeadQualificacaoEmojiTooltip({ qualificacao, className }: Props) {
  const emoji = GESITE_QUALIFICACAO_EMOJI[qualificacao];

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-xl border border-primary/25 bg-primary/5 px-2 py-1',
            'transition-all duration-200 hover:border-primary/55 hover:bg-primary/10',
            'hover:shadow-[0_0_12px_rgba(20,184,166,0.12)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            className,
          )}
          aria-label={emoji.label}
        >
          <NotoEmoji code={emoji.code} alt={emoji.alt} size={28} />
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
        <p>{emoji.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
