import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { riseItem, staggerContainer } from '@/lib/motion';
import { useSession } from '@/app/SessionContext';
import type { DashboardSummary } from '@/services/analytics';

/**
 * Shown while the club has effectively no data yet. It replaces the reflex of
 * filling an empty dashboard with invented figures: the numbers stay at zero
 * and the screen offers the next real step instead.
 */
export function SetupChecklist({
  summary,
  className,
}: {
  summary?: DashboardSummary;
  className?: string;
}) {
  const { club, teams, can } = useSession();

  const steps = [
    {
      label: 'Clube configurado',
      detail: club?.officialName ?? '',
      done: Boolean(club),
      to: '/app/configuracoes',
      allowed: can('settings.view'),
    },
    {
      label: 'Categorias definidas',
      detail: teams.length > 0 ? teams.map((team) => team.name).join(', ') : 'Nenhuma categoria',
      done: teams.length > 0,
      to: '/app/configuracoes',
      allowed: can('settings.view'),
    },
    {
      label: 'Pessoas cadastradas',
      detail: `${summary?.totalPeople ?? 0} no cadastro central`,
      done: (summary?.totalPeople ?? 0) > 1,
      to: '/app/pessoas',
      allowed: can('people.view'),
    },
    {
      label: 'Elenco montado',
      detail: `${summary?.totalPlayers ?? 0} jogadores vinculados`,
      done: (summary?.totalPlayers ?? 0) > 0,
      to: '/app/jogadores',
      allowed: can('squad.view'),
    },
    {
      label: 'Primeiro lançamento financeiro',
      detail: 'Entradas e saídas alimentam o fluxo de caixa',
      done: (summary?.monthIncome ?? 0) > 0 || (summary?.monthExpense ?? 0) > 0,
      to: '/app/entradas',
      allowed: can('finance.view'),
    },
  ].filter((step) => step.allowed);

  const done = steps.filter((step) => step.done).length;

  return (
    <motion.section
      variants={staggerContainer(0.05)}
      initial="initial"
      animate="animate"
      className={cn('overflow-hidden rounded-lg border border-line bg-graphite', className)}
    >
      <span
        aria-hidden
        className="block h-px w-full bg-gradient-to-r from-gold/50 via-gold/10 to-transparent"
      />
      <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-4 pt-5">
        <div>
          <p className="eyebrow mb-2">Primeiros passos</p>
          <h3 className="font-heading text-lg font-medium tracking-editorial text-ink">
            Vamos deixar o clube pronto para uso
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Os números do painel são calculados a partir do que for cadastrado — por isso ainda
            aparecem zerados.
          </p>
        </div>
        <p className="tabular text-2xs text-ink-faint">
          <span className="text-gold">{done}</span> de {steps.length} concluídos
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step) => (
          <motion.li key={step.label} variants={riseItem} className="bg-graphite">
            <Link
              to={step.to}
              className="group flex h-full items-start gap-3 px-5 py-4 transition-colors duration-150 hover:bg-surface-raised"
            >
              <span
                className={cn(
                  'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                  step.done
                    ? 'border-[rgba(53,183,121,0.4)] bg-success-wash text-success'
                    : 'border-line-strong text-ink-ghost',
                )}
              >
                {step.done ? <Check className="h-3 w-3" aria-hidden /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[13px]', step.done ? 'text-ink-muted' : 'text-ink')}>
                  {step.label}
                </span>
                <span className="mt-0.5 block truncate text-2xs text-ink-faint">{step.detail}</span>
              </span>
              {!step.done && (
                <ArrowRight
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-ghost opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                  aria-hidden
                />
              )}
            </Link>
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
