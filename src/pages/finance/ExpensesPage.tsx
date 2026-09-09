import { TransactionsView } from '@/modules/finance/TransactionsView';
import { expenseRepo } from '@/services';
import type { ExpenseCategory } from '@/types/domain';

const CATEGORIES: readonly ExpenseCategory[] = [
  'Material Esportivo',
  'Arbitragem',
  'Transporte',
  'Estrutura',
  'Alimentação',
  'Inscrições',
  'Saúde',
  'Outros',
];


export default function ExpensesPage() {
  return (
    <TransactionsView
      kind="saida"
      title="Saídas"
      description="Despesas operacionais do clube, do material esportivo à manutenção da estrutura."
      repo={expenseRepo}
      categories={CATEGORIES}
      counterpartyKey="supplier"
      counterpartyLabel="Fornecedor"
      counterpartyPlaceholder="Ex.: Esportes Marchetti"
    />
  );
}
