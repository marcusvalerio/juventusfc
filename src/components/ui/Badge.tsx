import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warn' | 'info' | 'gold' | 'muted';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-raised text-ink-muted border-line-strong',
  success: 'bg-success-wash text-success border-[rgba(53,183,121,0.28)]',
  danger: 'bg-danger-wash text-danger border-[rgba(224,82,82,0.28)]',
  warn: 'bg-warn-wash text-warn border-[rgba(217,160,60,0.28)]',
  info: 'bg-info-wash text-info border-[rgba(91,141,239,0.28)]',
  gold: 'bg-gold-wash text-gold-light border-line-gold',
  muted: 'bg-transparent text-ink-faint border-line',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export function Badge({ tone = 'neutral', dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium leading-5 transition-colors duration-150',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/* Shared status→tone maps so a status reads the same colour on every screen. */

const STATUS_TONES: Record<string, BadgeTone> = {
  ativo: 'success',
  disponivel: 'success',
  pago: 'success',
  realizado: 'success',
  confirmado: 'success',
  'em andamento': 'gold',
  agendado: 'info',
  planejado: 'info',
  pendente: 'warn',
  parcial: 'warn',
  baixo: 'warn',
  lesionado: 'warn',
  adiado: 'warn',
  suspenso: 'danger',
  atrasado: 'danger',
  esgotado: 'danger',
  cancelado: 'danger',
  inativo: 'muted',
  afastado: 'muted',
  encerrado: 'neutral',
};

const STATUS_LABELS: Record<string, string> = {
  disponivel: 'Disponível',
  'em andamento': 'Em andamento',
  saida: 'Saída',
  comissao: 'Comissão',
  diretoria: 'Diretoria',
  jogador: 'Jogador',
  administrativo: 'Administrativo',
};

export const statusTone = (status: string): BadgeTone => STATUS_TONES[status] ?? 'neutral';

export const statusLabel = (status: string) =>
  STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={statusTone(status)} dot className={className}>
      {statusLabel(status)}
    </Badge>
  );
}
