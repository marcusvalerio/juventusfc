import { useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Package, Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Stagger } from '@/components/motion/Reveal';
import { StatCard } from '@/components/data/StatCard';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { DetailList, DetailSection } from '@/components/data/DetailList';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Tabs } from '@/components/ui/Tabs';
import { ProgressBar } from '@/components/ui/Progress';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { cn } from '@/lib/cn';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/ui/Toast';
import { runSubmit } from '@/lib/submit';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { inventoryRepo, movementsRepo, peopleRepo } from '@/services';
import { formatDate, formatDateShort } from '@/lib/dates';
import type { InventoryCategory, InventoryItem, InventoryMovement } from '@/types/domain';

const CATEGORIES: InventoryCategory[] = ['Uniformes', 'Bolas', 'Treino', 'Equipamentos', 'Saúde', 'Outros'];
const UNITS = ['un', 'par', 'cx', 'kg'];

const emptyItem = { name: '', category: CATEGORIES[0] as string, quantity: '0', unit: 'un', minQuantity: '0', location: '', notes: '' };
const emptyMovement = { itemId: '', type: 'entrada', quantity: '1', date: '', responsible: '', reason: '', notes: '' };

const MOVEMENT_TONE = { entrada: 'success', saida: 'danger', ajuste: 'warn' } as const;

export default function InventoryPage() {
  const items = useAsync(() => inventoryRepo.list(), []);
  const people = useAsync(() => peopleRepo.list(), []);
  const movements = useAsync(() => movementsRepo.list(), []);
  const [tab, setTab] = useState('itens');
  const [selected, setSelected] = useState<InventoryItem | null>(null);
  const itemForm = useDisclosure();
  const movementForm = useDisclosure();
  const toast = useToast();
  const [itemValues, setItemValues] = useState(emptyItem);
  const [movementValues, setMovementValues] = useState(emptyMovement);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const itemsTable = useTableState<InventoryItem>(items.data, ['name', 'category', 'location'], {
    pageSize: 10,
    initialSort: { key: 'name', direction: 'asc' },
  });
  const movementsTable = useTableState<InventoryMovement>(movements.data, ['reason', 'responsible'], {
    pageSize: 10,
    initialSort: { key: 'date', direction: 'desc' },
  });

  const all = items.data ?? [];
  const lowCount = all.filter((item) => item.status === 'baixo').length;
  const outCount = all.filter((item) => item.status === 'esgotado').length;
  const itemName = (id: string) => all.find((item) => item.id === id)?.name ?? 'Item removido';

  const itemColumns: Column<InventoryItem>[] = [
    {
      key: 'name',
      header: 'Item',
      sortable: true,
      render: (item) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-ink">{item.name}</p>
          <p className="truncate text-2xs text-ink-faint">{item.location}</p>
        </div>
      ),
    },
    { key: 'category', header: 'Categoria', sortable: true, secondary: true, render: (item) => <Badge tone="neutral">{item.category}</Badge> },
    {
      key: 'quantity',
      header: 'Quantidade',
      align: 'right',
      sortable: true,
      render: (item) => (
        <div className="ml-auto w-28">
          <p className="tabular text-[13px] text-ink">
            {item.quantity} <span className="text-2xs text-ink-faint">{item.unit}</span>
          </p>
          <ProgressBar
            className="mt-1.5"
            value={(item.quantity / Math.max(item.minQuantity, 1)) * 100}
            tone={item.status === 'esgotado' ? 'danger' : item.status === 'baixo' ? 'gold' : 'success'}
            label={`Estoque de ${item.name}`}
          />
        </div>
      ),
    },
    {
      key: 'minQuantity',
      header: 'Mínimo',
      align: 'right',
      secondary: true,
      render: (item) => <span className="tabular text-ink-faint">{item.minQuantity}</span>,
    },
    { key: 'status', header: 'Status', align: 'right', render: (item) => <StatusBadge status={item.status} /> },
  ];

  const movementColumns: Column<InventoryMovement>[] = [
    { key: 'date', header: 'Data', sortable: true, width: '110px', render: (movement) => formatDateShort(movement.date) },
    {
      key: 'itemId',
      header: 'Item',
      render: (movement) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] text-ink">{itemName(movement.itemId)}</p>
          <p className="truncate text-2xs text-ink-faint">{movement.reason}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      render: (movement) => <Badge tone={MOVEMENT_TONE[movement.type]}>{movement.type}</Badge>,
    },
    { key: 'responsible', header: 'Responsável', secondary: true, render: (movement) => movement.responsible },
    {
      key: 'quantity',
      header: 'Qtd.',
      align: 'right',
      render: (movement) => (
        <span
          className={cn(
            'tabular font-medium',
            movement.type === 'entrada' ? 'text-success' : movement.type === 'saida' ? 'text-danger' : 'text-warn',
          )}
        >
          {movement.type === 'entrada' ? '+' : movement.type === 'saida' ? '−' : '±'}
          {Math.abs(movement.quantity)}
        </span>
      ),
    },
  ];

  const submitItem = async () => {
    const nextErrors: Record<string, string> = {};
    if (!itemValues.name.trim()) nextErrors.name = 'Informe o nome do item.';
    if (!itemValues.location.trim()) nextErrors.location = 'Informe a localização.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const ok = await runSubmit(
      async () => {
        await inventoryRepo.create({
          name: itemValues.name,
          category: itemValues.category,
          quantity: itemValues.quantity,
          unit: itemValues.unit,
          minQuantity: itemValues.minQuantity,
          location: itemValues.location,
          notes: itemValues.notes,
        });
        items.reload();
      },
      setErrors,
      toast,
    );
    if (ok) setItemValues(emptyItem);
    return ok;
  };

  const submitMovement = async () => {
    const nextErrors: Record<string, string> = {};
    if (!movementValues.itemId) nextErrors.itemId = 'Selecione o item.';
    if (!movementValues.date) nextErrors.date = 'Informe a data.';
    if (!movementValues.reason.trim()) nextErrors.reason = 'Informe o motivo.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const ok = await runSubmit(
      async () => {
        await movementsRepo.create({
          itemId: movementValues.itemId,
          type: movementValues.type,
          quantity: movementValues.quantity,
          date: movementValues.date,
          responsible: movementValues.responsible,
          reason: movementValues.reason,
          notes: movementValues.notes,
        });
        // The balance changes with the movement, so both lists are refreshed.
        items.reload();
        movements.reload();
      },
      setErrors,
      toast,
    );
    if (ok) setMovementValues(emptyMovement);
    return ok;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Patrimônio"
        title="Estoque"
        description="Uniformes, materiais de treino e equipamentos do clube, com alertas de reposição."
        actions={
          <>
            <Button variant="secondary" icon={<ArrowLeftRight />} onClick={movementForm.open}>
              Movimentar
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={itemForm.open}>
              Novo item
            </Button>
          </>
        }
      />

      <Stagger className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Itens cadastrados" value={all.length} loading={items.status === 'loading'} icon={<Package />} />
        <StatCard
          label="Abaixo do mínimo"
          value={lowCount}
          hint={lowCount > 0 ? 'Reposição recomendada' : 'Tudo dentro do previsto'}
          loading={items.status === 'loading'}
          icon={<AlertTriangle />}
        />
        <StatCard
          label="Esgotados"
          value={outCount}
          hint={outCount > 0 ? 'Reposição urgente' : 'Nenhum item zerado'}
          loading={items.status === 'loading'}
        />
        <StatCard
          accent
          label="Movimentações"
          value={(movements.data ?? []).length}
          hint="registradas no período"
          loading={movements.status === 'loading'}
        />
      </Stagger>

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'itens', label: 'Itens', count: items.data?.length },
          { value: 'movimentacoes', label: 'Movimentações', count: movements.data?.length },
        ]}
      />

      {tab === 'itens' ? (
        <DataTable
          columns={itemColumns}
          rows={itemsTable.rows}
          status={items.status}
          sort={itemsTable.sort}
          onSort={itemsTable.toggleSort}
          onRetry={items.reload}
          getRowId={(item) => item.id}
          onRowClick={setSelected}
          toolbar={
            <FilterBar
              search={itemsTable.search}
              onSearch={itemsTable.setSearch}
              searchPlaceholder="Buscar item…"
              filters={[
                { key: 'category', label: 'Categoria', options: CATEGORIES.map((value) => ({ value, label: value })) },
                {
                  key: 'status',
                  label: 'Situação',
                  options: [
                    { value: 'disponivel', label: 'Disponível' },
                    { value: 'baixo', label: 'Baixo' },
                    { value: 'esgotado', label: 'Esgotado' },
                  ],
                },
              ]}
              values={itemsTable.filters}
              onFilter={itemsTable.setFilter}
              onReset={itemsTable.resetFilters}
              activeCount={itemsTable.activeFilterCount}
            />
          }
          pagination={{
            page: itemsTable.page,
            pageCount: itemsTable.pageCount,
            total: itemsTable.total,
            pageSize: itemsTable.pageSize,
            onChange: itemsTable.setPage,
          }}
          empty={{ title: 'Nenhum item encontrado', description: 'Ajuste os filtros ou cadastre um novo item.' }}
        />
      ) : (
        <DataTable
          columns={movementColumns}
          rows={movementsTable.rows}
          status={movements.status}
          sort={movementsTable.sort}
          onSort={movementsTable.toggleSort}
          onRetry={movements.reload}
          getRowId={(movement) => movement.id}
          toolbar={
            <FilterBar
              search={movementsTable.search}
              onSearch={movementsTable.setSearch}
              searchPlaceholder="Buscar movimentação…"
              filters={[
                {
                  key: 'type',
                  label: 'Tipo',
                  options: [
                    { value: 'entrada', label: 'Entrada' },
                    { value: 'saida', label: 'Saída' },
                    { value: 'ajuste', label: 'Ajuste' },
                  ],
                },
              ]}
              values={movementsTable.filters}
              onFilter={movementsTable.setFilter}
              onReset={movementsTable.resetFilters}
              activeCount={movementsTable.activeFilterCount}
            />
          }
          pagination={{
            page: movementsTable.page,
            pageCount: movementsTable.pageCount,
            total: movementsTable.total,
            pageSize: movementsTable.pageSize,
            onChange: movementsTable.setPage,
          }}
          empty={{ title: 'Nenhuma movimentação', description: 'Registre entradas, saídas e ajustes de estoque.' }}
        />
      )}

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.category}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button
              variant="secondary"
              icon={<ArrowLeftRight />}
              onClick={() => {
                setMovementValues({ ...emptyMovement, itemId: selected?.id ?? '' });
                setSelected(null);
                movementForm.open();
              }}
            >
              Movimentar
            </Button>
          </>
        }
      >
        {selected && (
          <div className="divide-y divide-line">
            <DetailSection title="Situação">
              <div className="mb-5 flex items-end justify-between gap-4">
                <p className="tabular font-heading text-[30px] font-medium tracking-tightest text-ink">
                  {selected.quantity}
                  <span className="ml-2 text-sm text-ink-faint">{selected.unit}</span>
                </p>
                <StatusBadge status={selected.status} />
              </div>
              <ProgressBar
                value={(selected.quantity / Math.max(selected.minQuantity, 1)) * 100}
                tone={selected.status === 'esgotado' ? 'danger' : selected.status === 'baixo' ? 'gold' : 'success'}
              />
              <p className="mt-2 text-2xs text-ink-faint">Estoque mínimo: {selected.minQuantity} {selected.unit}</p>
            </DetailSection>

            <DetailSection title="Cadastro">
              <DetailList
                items={[
                  { label: 'Categoria', value: selected.category },
                  { label: 'Localização', value: selected.location },
                  { label: 'Unidade', value: selected.unit },
                  { label: 'Observações', value: selected.notes, wide: true },
                ]}
              />
            </DetailSection>

            <DetailSection title="Últimas movimentações">
              {(movements.data ?? []).filter((movement) => movement.itemId === selected.id).length === 0 ? (
                <p className="text-[13px] text-ink-faint">Nenhuma movimentação registrada para este item.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                  {(movements.data ?? [])
                    .filter((movement) => movement.itemId === selected.id)
                    .map((movement) => (
                      <li key={movement.id} className="flex items-center justify-between gap-3 px-3.5 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-ink">{movement.reason}</p>
                          <p className="text-2xs text-ink-faint">
                            {formatDate(movement.date)} · {movement.responsible}
                          </p>
                        </div>
                        <Badge tone={MOVEMENT_TONE[movement.type]}>
                          {movement.type === 'entrada' ? '+' : movement.type === 'saida' ? '−' : '±'}
                          {Math.abs(movement.quantity)}
                        </Badge>
                      </li>
                    ))}
                </ul>
              )}
            </DetailSection>
          </div>
        )}
      </Drawer>

      <FormModal
        open={itemForm.isOpen}
        onClose={itemForm.close}
        title="Novo item de estoque"
        description="Cadastre o material e defina o estoque mínimo para gerar alertas."
        successMessage="Item cadastrado"
        onSubmit={submitItem}
      >
        <FormSection title="Item">
          <Field label="Nome" required error={errors.name} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={itemValues.name}
                onChange={(e) => setItemValues({ ...itemValues, name: e.target.value })}
                placeholder="Ex.: Camisa oficial I"
              />
            )}
          </Field>
          <Field label="Categoria">
            {({ id }) => (
              <Select
                id={id}
                value={itemValues.category}
                onChange={(e) => setItemValues({ ...itemValues, category: e.target.value })}
                options={CATEGORIES.map((value) => ({ value, label: value }))}
              />
            )}
          </Field>
          <Field label="Unidade">
            {({ id }) => (
              <Select
                id={id}
                value={itemValues.unit}
                onChange={(e) => setItemValues({ ...itemValues, unit: e.target.value })}
                options={UNITS.map((value) => ({ value, label: value }))}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Controle">
          <Field label="Quantidade atual">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                value={itemValues.quantity}
                onChange={(e) => setItemValues({ ...itemValues, quantity: e.target.value })}
              />
            )}
          </Field>
          <Field label="Estoque mínimo" hint="Abaixo disso o item entra em alerta.">
            {({ id }) => (
              <Input
                id={id}
                type="number"
                min={0}
                value={itemValues.minQuantity}
                onChange={(e) => setItemValues({ ...itemValues, minQuantity: e.target.value })}
              />
            )}
          </Field>
          <Field label="Localização" required error={errors.location} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={itemValues.location}
                onChange={(e) => setItemValues({ ...itemValues, location: e.target.value })}
                placeholder="Ex.: Almoxarifado — Prateleira A1"
              />
            )}
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            {({ id }) => (
              <Textarea
                id={id}
                value={itemValues.notes}
                onChange={(e) => setItemValues({ ...itemValues, notes: e.target.value })}
              />
            )}
          </Field>
        </FormSection>
      </FormModal>

      <FormModal
        open={movementForm.isOpen}
        onClose={movementForm.close}
        title="Movimentar estoque"
        description="Registre entradas, saídas ou ajustes de inventário."
        size="sm"
        successMessage="Movimentação registrada"
        onSubmit={submitMovement}
      >
        <FormSection title="Movimentação" columns={1}>
          <Field label="Item" required error={errors.itemId}>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={movementValues.itemId}
                placeholder="Selecione o item"
                onChange={(e) => setMovementValues({ ...movementValues, itemId: e.target.value })}
                options={all.map((item) => ({ value: item.id, label: `${item.name} (${item.quantity} ${item.unit})` }))}
              />
            )}
          </Field>
          <Field label="Tipo">
            {({ id }) => (
              <Select
                id={id}
                value={movementValues.type}
                onChange={(e) => setMovementValues({ ...movementValues, type: e.target.value })}
                options={[
                  { value: 'entrada', label: 'Entrada' },
                  { value: 'saida', label: 'Saída' },
                  { value: 'ajuste', label: 'Ajuste' },
                ]}
              />
            )}
          </Field>
          <Field label="Quantidade" required>
            {({ id }) => (
              <Input
                id={id}
                type="number"
                value={movementValues.quantity}
                onChange={(e) => setMovementValues({ ...movementValues, quantity: e.target.value })}
              />
            )}
          </Field>
          <Field label="Data" required error={errors.date}>
            {({ id, invalid }) => (
              <DatePicker
                id={id}
                invalid={invalid}
                value={movementValues.date}
                onChange={(e) => setMovementValues({ ...movementValues, date: e.target.value })}
              />
            )}
          </Field>
          <Field label="Responsável">
            {({ id }) => (
              <Select
                id={id}
                value={movementValues.responsible}
                onChange={(e) => setMovementValues({ ...movementValues, responsible: e.target.value })}
                placeholder="Selecione o responsável"
                options={(people.data ?? []).map((person) => ({
                  value: person.fullName,
                  label: person.fullName,
                }))}
              />
            )}
          </Field>
          <Field label="Motivo" required error={errors.reason}>
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={movementValues.reason}
                onChange={(e) => setMovementValues({ ...movementValues, reason: e.target.value })}
                placeholder="Ex.: Entrega ao elenco"
              />
            )}
          </Field>
          <Field label="Observações">
            {({ id }) => (
              <Textarea
                id={id}
                value={movementValues.notes}
                onChange={(e) => setMovementValues({ ...movementValues, notes: e.target.value })}
              />
            )}
          </Field>
        </FormSection>
      </FormModal>
    </PageTransition>
  );
}
