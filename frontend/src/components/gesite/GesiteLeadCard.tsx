import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GesiteLeadPersonaAvatar } from '@/components/gesite/GesiteLeadPersonaAvatar';
import { GesiteLeadQualificacaoEmojiTooltip } from '@/components/gesite/GesiteLeadQualificacaoEmojiTooltip';
import { cn } from '@/lib/utils';
import { GESITE_QUALIFICACAO_ACCENT } from '@/lib/gesiteLeadQualificacaoEmoji';
import type { GesiteLeadQualificacao } from '@/rules/qualifyGesiteLead';

export type GesiteLeadCardRow = {
  id: string;
  dataHora: string;
  nome: string;
  pagina: string;
  origem: string;
  canal: string;
  qualificacao: GesiteLeadQualificacao;
  email: string;
  telefone: string;
  relacionamento: string;
  investimento: string;
  perfilLead: string;
};

type GesiteLeadCardTab = 'fonte' | 'perfil';

type Props = {
  row: GesiteLeadCardRow;
  tab: GesiteLeadCardTab;
  onClick?: () => void;
  className?: string;
};

function fieldOrDash(value: string): string {
  const t = value.trim();
  return t.length > 0 ? t : '—';
}

export function GesiteLeadCard({ row, tab, onClick, className }: Props) {
  const accent = GESITE_QUALIFICACAO_ACCENT[row.qualificacao];
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
        'flex h-full flex-col overflow-hidden border-l-4 transition-shadow hover:shadow-md',
        accent.border,
        onClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <GesiteLeadPersonaAvatar nome={row.nome} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold leading-tight">{row.nome}</p>
              <GesiteLeadQualificacaoEmojiTooltip qualificacao={row.qualificacao} />
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{fieldOrDash(row.email)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pb-4 pt-0 text-xs text-muted-foreground">
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
