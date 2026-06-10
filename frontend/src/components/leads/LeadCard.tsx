import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LeadPersonaAvatar } from '@/components/leads/LeadPersonaAvatar';
import { LeadQualificacaoEmojiTooltip } from '@/components/leads/LeadQualificacaoEmojiTooltip';
import { getLeadGender, getLeadGenderAvatarRing } from '@/lib/leadGender';
import { cn } from '@/lib/utils';
import { LEAD_QUALIFICACAO_ACCENT } from '@/lib/leadQualificacaoEmoji';
import type { LeadQualificacao } from '@/rules/qualifyLead';

export type LeadCardRow = {
  id: string;
  dataHora: string;
  nome: string;
  pagina: string;
  origem: string;
  canal: string;
  qualificacao: LeadQualificacao;
  email: string;
  telefone: string;
  relacionamento: string;
  investimento: string;
  perfilLead: string;
};

type LeadCardTab = 'fonte' | 'perfil';

type Props = {
  row: LeadCardRow;
  tab: LeadCardTab;
  onClick?: () => void;
  className?: string;
};

function fieldOrDash(value: string): string {
  const t = value.trim();
  return t.length > 0 ? t : '—';
}

export function LeadCard({ row, tab, onClick, className }: Props) {
  const accent = LEAD_QUALIFICACAO_ACCENT[row.qualificacao];
  const gender = getLeadGender({ name: row.nome });
  const genderRing = getLeadGenderAvatarRing(gender);
  const dataLabel = new Date(row.dataHora).toLocaleString('pt-BR');

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'group relative flex h-full flex-col overflow-hidden border-l-4',
        'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30',
        'hover:ring-2 hover:ring-offset-2 hover:ring-offset-background',
        accent.border,
        accent.ring,
        onClick &&
          'cursor-pointer active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
          accent.bg,
        )}
        aria-hidden
      />
      <CardHeader className="relative z-[1] pb-3">
        <div className="flex items-start gap-3">
          <LeadPersonaAvatar
            nome={row.nome}
            gender={gender}
            className={cn(
              'ring-2 ring-offset-1 ring-offset-background transition-all duration-300 group-hover:scale-105',
              genderRing,
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold leading-tight transition-colors duration-300 group-hover:text-foreground">
                {row.nome}
              </p>
              <LeadQualificacaoEmojiTooltip qualificacao={row.qualificacao} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{fieldOrDash(row.email)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-[1] flex flex-1 flex-col space-y-1.5 pb-4 pt-0 text-xs text-muted-foreground transition-colors duration-300 group-hover:text-muted-foreground/90">
        {tab === 'fonte' ? (
          <>
            <p>
              <span className="font-medium text-foreground/80">Origem:</span> {fieldOrDash(row.origem)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Canal:</span> {fieldOrDash(row.canal)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Página:</span> {fieldOrDash(row.pagina)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Telefone:</span> {fieldOrDash(row.telefone)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Data:</span> {dataLabel}
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="font-medium text-foreground/80">Relacionamento:</span>{' '}
              {fieldOrDash(row.relacionamento)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Investimento:</span>{' '}
              {fieldOrDash(row.investimento)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Perfil:</span> {fieldOrDash(row.perfilLead)}
            </p>
            <p>
              <span className="font-medium text-foreground/80">Data:</span> {dataLabel}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
