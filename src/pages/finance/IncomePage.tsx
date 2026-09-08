import { TransactionsView } from '@/modules/finance/TransactionsView';
import { incomeRepo } from '@/services';
import type { IncomeCategory } from '@/types/domain';

const CATEGORIES: readonly IncomeCategory[] = ['Mensalidades', 'Patrocínio', 'Eventos', 'Doações', 'Bilheteria', 'Outros'];

const RESPONSIBLES = [
  'Beatriz Rangel',
  'Cláudia Perretti',
  'Aurélio Mancini',
  'Renata Colombo',
  'Marcelo Grimaldi',
] as const;

export default function IncomePage() {
  return (
    <TransactionsView
      kind="entrada"
      title="Entradas"
      description="Todo recurso que chega ao clube: mensalidades, patrocínio, eventos, bilheteria e doações."
      repo={incomeRepo}
      categories={CATEGORIES}
      counterpartyKey="source"
      counterpartyLabel="Origem"
      counterpartyPlaceholder="Ex.: Grimaldi Materiais"
      responsibles={RESPONSIBLES}
    />
  );
}
