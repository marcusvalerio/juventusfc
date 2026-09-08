import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Download,
  FileBarChart,
  Receipt,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/Tabs';
import { Modal } from '@/components/ui/Modal';
import { DetailList } from '@/components/data/DetailList';
import { useToast } from '@/components/ui/Toast';
import { useDisclosure } from '@/hooks/useDisclosure';
import { riseItem, staggerContainer } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { useAsync } from '@/hooks/useAsync';
import { getCashFlow, getDashboardSummary } from '@/services/analytics';
import { currency } from '@/lib/format';
import { MONTHS_LONG, TODAY } from '@/lib/dates';

interface ReportDefinition {
  id: string;
  group: 'Clube' | 'Futebol' | 'Financeiro' | 'Patrimônio';
  title: string;
  description: string;
  icon: LucideIcon;
  fields: string[];
}

const REPORTS: ReportDefinition[] = [
  { id: 'rep-players', group: 'Clube', title: 'Elenco por equipe', description: 'Jogadores ativos, posições, categorias e situação no elenco.', icon: Users, fields: ['Nome', 'Camisa', 'Posição', 'Equipe', 'Situação', 'Mensalidade'] },
  { id: 'rep-people', group: 'Clube', title: 'Pessoas cadastradas', description: 'Cadastro central com vínculos e dados de contato.', icon: Users, fields: ['Nome', 'Vínculos', 'Telefone', 'E-mail', 'Cidade', 'Status'] },
  { id: 'rep-dues', group: 'Financeiro', title: 'Mensalidades por competência', description: 'Situação das cobranças mês a mês, com valores previstos e recebidos.', icon: Receipt, fields: ['Jogador', 'Referência', 'Vencimento', 'Previsto', 'Pago', 'Status'] },
  { id: 'rep-income', group: 'Financeiro', title: 'Entradas por categoria', description: 'Origem dos recursos recebidos no período selecionado.', icon: ArrowUpRight, fields: ['Data', 'Descrição', 'Categoria', 'Origem', 'Valor', 'Responsável'] },
  { id: 'rep-expense', group: 'Financeiro', title: 'Saídas por categoria', description: 'Despesas agrupadas por natureza e fornecedor.', icon: Wallet, fields: ['Data', 'Descrição', 'Categoria', 'Fornecedor', 'Valor', 'Responsável'] },
  { id: 'rep-cashflow', group: 'Financeiro', title: 'Fluxo de caixa consolidado', description: 'Entradas, saídas e saldo acumulado por mês.', icon: Wallet, fields: ['Mês', 'Entradas', 'Saídas', 'Resultado', 'Saldo'] },
  { id: 'rep-matches', group: 'Futebol', title: 'Jogos e resultados', description: 'Partidas realizadas e agendadas por competição e categoria.', icon: CalendarDays, fields: ['Data', 'Adversário', 'Competição', 'Mando', 'Placar', 'Status'] },
  { id: 'rep-trainings', group: 'Futebol', title: 'Treinamentos realizados', description: 'Sessões por equipe, tipo de trabalho e responsável.', icon: CalendarDays, fields: ['Data', 'Tipo', 'Equipe', 'Local', 'Responsável', 'Status'] },
  { id: 'rep-inventory', group: 'Patrimônio', title: 'Posição de estoque', description: 'Itens, quantidades, mínimos e alertas de reposição.', icon: Boxes, fields: ['Item', 'Categoria', 'Quantidade', 'Mínimo', 'Localização', 'Status'] },
];

const GROUPS = ['Todos', 'Clube', 'Futebol', 'Financeiro', 'Patrimônio'];

export default function ReportsPage() {
  const [group, setGroup] = useState('Todos');
  const [selected, setSelected] = useState<ReportDefinition | null>(null);
  const preview = useDisclosure();
  const toast = useToast();

  const summary = useAsync(getDashboardSummary, []);
  const cashFlow = useAsync(() => getCashFlow(6), []);

  const visible = group === 'Todos' ? REPORTS : REPORTS.filter((report) => report.group === group);
  const monthLabel = `${MONTHS_LONG[TODAY.getMonth()]} de ${TODAY.getFullYear()}`;

  const openPreview = (report: ReportDefinition) => {
    setSelected(report);
    preview.open();
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Gestão"
        title="Relatórios"
        description="Central de relatórios do clube. A estrutura já está pronta para exportação assim que os dados reais estiverem conectados."
        actions={
          <SegmentedControl
            value={group}
            onChange={setGroup}
            items={GROUPS.map((value) => ({ value, label: value }))}
          />
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 overflow-hidden rounded-lg border border-line bg-graphite"
      >
        <span aria-hidden className="block h-px w-full bg-gradient-to-r from-gold/40 via-gold/10 to-transparent" />
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Competência', value: monthLabel },
            { label: 'Saldo consolidado', value: currency(summary.data?.balance ?? 0) },
            { label: 'Entradas no mês', value: currency(summary.data?.monthIncome ?? 0) },
            { label: 'Saídas no mês', value: currency(summary.data?.monthExpense ?? 0) },
          ].map((item) => (
            <div key={item.label} className="bg-graphite px-5 py-4">
              <p className="eyebrow">{item.label}</p>
              <p className="tabular mt-2 font-heading text-[15px] text-ink first-letter:uppercase">{item.value}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.ul
        key={group}
        variants={staggerContainer(0.04)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {visible.map((report) => {
          const Icon = report.icon;
          return (
            <motion.li key={report.id} variants={riseItem}>
              <button
                type="button"
                onClick={() => openPreview(report)}
                className={cn(
                  'group flex h-full w-full flex-col rounded-lg border border-line bg-graphite p-5 text-left',
                  'transition-colors duration-200 hover:border-line-strong hover:bg-surface-raised',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-sunken text-ink-faint transition-colors duration-200 group-hover:text-gold">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <Badge tone="muted">{report.group}</Badge>
                </div>
                <p className="mt-4 font-heading text-[15px] font-medium tracking-editorial text-ink">{report.title}</p>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{report.description}</p>
                <span className="mt-auto flex items-center gap-1.5 pt-5 text-2xs text-ink-ghost transition-colors duration-200 group-hover:text-gold">
                  Visualizar estrutura
                  <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                </span>
              </button>
            </motion.li>
          );
        })}
      </motion.ul>

      <Modal
        open={preview.isOpen}
        onClose={preview.close}
        title={selected?.title ?? ''}
        description={selected?.description}
        footer={
          <>
            <Button variant="ghost" onClick={preview.close}>
              Fechar
            </Button>
            <Button
              variant="gold"
              icon={<Download />}
              onClick={() => {
                toast.notify({
                  tone: 'info',
                  title: 'Exportação na próxima etapa',
                  description: 'A geração de PDF e planilha será habilitada com os dados reais.',
                });
                preview.close();
              }}
            >
              Exportar
            </Button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <DetailList
              items={[
                { label: 'Área', value: selected.group },
                { label: 'Competência', value: monthLabel },
              ]}
            />

            <div>
              <p className="eyebrow mb-3">Colunas do relatório</p>
              <div className="overflow-hidden rounded-md border border-line">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line bg-surface-sunken">
                      {selected.fields.map((field) => (
                        <th key={field} className="px-3 py-2 text-left text-2xs font-medium uppercase tracking-label text-ink-faint">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[0, 1, 2].map((row) => (
                      <tr key={row} className="border-b border-line last:border-b-0">
                        {selected.fields.map((field) => (
                          <td key={field} className="px-3 py-2.5">
                            <span className="skeleton-sheen block h-2.5 rounded" style={{ width: `${52 + ((row + field.length) % 5) * 8}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selected.id === 'rep-cashflow' && cashFlow.data && (
              <div>
                <p className="eyebrow mb-3">Prévia dos dados</p>
                <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                  {cashFlow.data.map((point) => (
                    <li key={point.ref} className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-2xs">
                      <span className="uppercase tracking-label text-ink-faint">{point.label}</span>
                      <span className="flex items-center gap-4">
                        <span className="tabular text-success">+{currency(point.income)}</span>
                        <span className="tabular text-danger">−{currency(point.expense)}</span>
                        <span className="tabular w-24 text-right text-ink">{currency(point.balance)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="flex items-start gap-2.5 rounded-md border border-line bg-surface-sunken px-3.5 py-3 text-2xs leading-relaxed text-ink-faint">
              <FileBarChart className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Nesta versão os relatórios exibem a estrutura definitiva. A exportação em PDF e
              planilha será habilitada junto com a integração de dados reais.
            </p>
          </div>
        )}
      </Modal>
    </PageTransition>
  );
}
