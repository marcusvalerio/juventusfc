import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { DetailList, DetailSection } from '@/components/data/DetailList';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/ui/Drawer';
import { DatePicker, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { useAsync } from '@/hooks/useAsync';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { boardRepo } from '@/services';
import { people } from '@/data/people';
import { formatDate } from '@/lib/dates';
import type { BoardMember } from '@/types/domain';

const ROLES = [
  'Presidente',
  'Vice-presidente',
  'Diretor Financeiro',
  'Diretor de Futebol',
  'Diretor Administrativo',
  'Diretor de Marketing',
  'Diretor Social',
];

const emptyForm = { personId: '', role: ROLES[0], startDate: '', endDate: '', phone: '', email: '', notes: '' };

export default function BoardPage() {
  const { data, status, reload } = useAsync(() => boardRepo.list(), []);
  const [selected, setSelected] = useState<BoardMember | null>(null);
  const form = useDisclosure();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const table = useTableState<BoardMember>(data, ['name', 'role', 'email', 'phone'], {
    pageSize: 8,
    initialSort: { key: 'name', direction: 'asc' },
  });

  const columns: Column<BoardMember>[] = [
    {
      key: 'name',
      header: 'Membro',
      sortable: true,
      render: (member) => (
        <div className="flex items-center gap-3">
          <Avatar name={member.name} size="sm" tone={member.status === 'ativo' ? 'gold' : 'neutral'} />
          <span className="truncate text-[13px] text-ink">{member.name}</span>
        </div>
      ),
    },
    { key: 'role', header: 'Cargo', sortable: true, render: (member) => <span className="text-ink-muted">{member.role}</span> },
    { key: 'startDate', header: 'Início', sortable: true, secondary: true, render: (member) => formatDate(member.startDate) },
    { key: 'endDate', header: 'Término', secondary: true, render: (member) => formatDate(member.endDate) },
    { key: 'phone', header: 'Contato', secondary: true, render: (member) => member.phone ?? '—' },
    { key: 'status', header: 'Status', align: 'right', render: (member) => <StatusBadge status={member.status} /> },
  ];

  const submit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.personId) nextErrors.personId = 'Selecione a pessoa.';
    if (!values.startDate) nextErrors.startDate = 'Informe a data de início.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    setValues(emptyForm);
    return true;
  };

  const activeCount = (data ?? []).filter((member) => member.status === 'ativo').length;

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clube"
        title="Diretoria"
        description="Composição da diretoria, mandatos e responsáveis por cada área da gestão."
        meta={
          <p className="text-2xs text-ink-faint">
            <span className="tabular text-ink-muted">{activeCount}</span> cargos ativos ·{' '}
            <span className="tabular text-ink-muted">{(data ?? []).length}</span> registros no histórico
          </p>
        }
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Novo membro
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={table.rows}
        status={status}
        sort={table.sort}
        onSort={table.toggleSort}
        onRetry={reload}
        getRowId={(member) => member.id}
        onRowClick={setSelected}
        toolbar={
          <FilterBar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Buscar membro…"
            filters={[
              {
                key: 'status',
                label: 'Situação',
                options: [
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'encerrado', label: 'Encerrado' },
                ],
              },
            ]}
            values={table.filters}
            onFilter={table.setFilter}
            onReset={table.resetFilters}
            activeCount={table.activeFilterCount}
          />
        }
        pagination={{
          page: table.page,
          pageCount: table.pageCount,
          total: table.total,
          pageSize: table.pageSize,
          onChange: table.setPage,
        }}
        empty={{ title: 'Nenhum membro encontrado', description: 'Ajuste os filtros ou registre um novo membro da diretoria.' }}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name ?? ''}
        subtitle={selected?.role}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button variant="secondary">Editar</Button>
          </>
        }
      >
        {selected && (
          <div className="divide-y divide-line">
            <DetailSection title="Mandato">
              <DetailList
                items={[
                  { label: 'Cargo', value: selected.role },
                  { label: 'Status', value: <StatusBadge status={selected.status} /> },
                  { label: 'Início', value: formatDate(selected.startDate) },
                  { label: 'Término', value: formatDate(selected.endDate) },
                ]}
              />
            </DetailSection>
            <DetailSection title="Contato">
              <DetailList
                items={[
                  { label: 'Telefone', value: selected.phone },
                  { label: 'E-mail', value: selected.email },
                  { label: 'Observações', value: selected.notes, wide: true },
                ]}
              />
            </DetailSection>
          </div>
        )}
      </Drawer>

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Novo membro da diretoria"
        description="O membro é vinculado a uma pessoa já cadastrada."
        successMessage="Membro registrado"
        onSubmit={submit}
      >
        <FormSection title="Vínculo">
          <Field label="Pessoa" required error={errors.personId}>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={values.personId}
                placeholder="Selecione a pessoa"
                onChange={(event) => setValues({ ...values, personId: event.target.value })}
                options={people.map((person) => ({ value: person.id, label: person.fullName }))}
              />
            )}
          </Field>
          <Field label="Cargo" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.role}
                onChange={(event) => setValues({ ...values, role: event.target.value })}
                options={ROLES.map((role) => ({ value: role, label: role }))}
              />
            )}
          </Field>
          <Field label="Data de início" required error={errors.startDate}>
            {({ id, invalid }) => (
              <DatePicker
                id={id}
                invalid={invalid}
                value={values.startDate}
                onChange={(event) => setValues({ ...values, startDate: event.target.value })}
              />
            )}
          </Field>
          <Field label="Data de término" hint="Deixe vazio para mandato em curso.">
            {({ id }) => (
              <DatePicker
                id={id}
                value={values.endDate}
                onChange={(event) => setValues({ ...values, endDate: event.target.value })}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Contato">
          <Field label="Telefone">
            {({ id }) => (
              <Input id={id} value={values.phone} onChange={(event) => setValues({ ...values, phone: event.target.value })} />
            )}
          </Field>
          <Field label="E-mail">
            {({ id }) => (
              <Input id={id} type="email" value={values.email} onChange={(event) => setValues({ ...values, email: event.target.value })} />
            )}
          </Field>
          <Field label="Observações" className="sm:col-span-2">
            {({ id }) => (
              <Textarea id={id} value={values.notes} onChange={(event) => setValues({ ...values, notes: event.target.value })} />
            )}
          </Field>
        </FormSection>
      </FormModal>
    </PageTransition>
  );
}
