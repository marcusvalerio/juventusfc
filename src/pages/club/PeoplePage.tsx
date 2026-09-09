import { useState } from 'react';
import { Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { DataTable, type Column } from '@/components/data/DataTable';
import { FilterBar } from '@/components/data/FilterBar';
import { DetailList, DetailSection } from '@/components/data/DetailList';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Drawer } from '@/components/ui/Drawer';
import { Field, Input, Select, Textarea, DatePicker } from '@/components/ui/Field';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/ui/Toast';
import { runSubmit } from '@/lib/submit';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { peopleRepo } from '@/services';
import { age, formatDate } from '@/lib/dates';
import type { Person } from '@/types/domain';

const ROLE_LABELS: Record<string, string> = {
  jogador: 'Jogador',
  diretoria: 'Diretoria',
  comissao: 'Comissão',
  administrativo: 'Administrativo',
  outro: 'Outro',
};

const emptyForm = { fullName: '', nickname: '', birthDate: '', phone: '', email: '', document: '', city: '', role: 'jogador', notes: '' };

export default function PeoplePage() {
  const { data, status, reload } = useAsync(() => peopleRepo.list(), []);
  const [selected, setSelected] = useState<Person | null>(null);
  const form = useDisclosure();
  const toast = useToast();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setValues(emptyForm);
    setErrors({});
    form.open();
  };

  const openEdit = (person: Person) => {
    setEditingId(person.id);
    setValues({
      fullName: person.fullName,
      nickname: person.nickname ?? '',
      birthDate: person.birthDate ?? '',
      phone: person.phone ?? '',
      email: person.email ?? '',
      document: person.document ?? '',
      city: person.city ?? '',
      role: person.roles[0] ?? 'jogador',
      notes: person.notes ?? '',
    });
    setErrors({});
    setSelected(null);
    form.open();
  };

  const table = useTableState<Person>(data, ['fullName', 'nickname', 'email', 'phone', 'city'], {
    pageSize: 10,
    initialSort: { key: 'fullName', direction: 'asc' },
  });

  const columns: Column<Person>[] = [
    {
      key: 'fullName',
      header: 'Pessoa',
      sortable: true,
      render: (person) => (
        <div className="flex items-center gap-3">
          <Avatar name={person.fullName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13px] text-ink">{person.fullName}</p>
            {person.nickname && <p className="truncate text-2xs text-ink-faint">“{person.nickname}”</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Vínculos',
      render: (person) => (
        <div className="flex flex-wrap gap-1">
          {person.roles.map((role) => (
            <Badge key={role} tone={role === 'jogador' ? 'gold' : 'neutral'}>
              {ROLE_LABELS[role]}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'phone', header: 'Telefone', secondary: true, render: (person) => person.phone ?? '—' },
    { key: 'city', header: 'Cidade', secondary: true, render: (person) => person.city ?? '—' },
    {
      key: 'birthDate',
      header: 'Idade',
      align: 'right',
      secondary: true,
      render: (person) => <span className="tabular">{age(person.birthDate) ?? '—'}</span>,
    },
    { key: 'status', header: 'Status', align: 'right', render: (person) => <StatusBadge status={person.status} /> },
  ];

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!values.fullName.trim()) nextErrors.fullName = 'Informe o nome completo.';
    if (values.email && !values.email.includes('@')) nextErrors.email = 'E-mail inválido.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const payload = {
      fullName: values.fullName,
      nickname: values.nickname,
      birthDate: values.birthDate,
      phone: values.phone,
      email: values.email,
      document: values.document,
      city: values.city,
      notes: values.notes,
      status: 'ativo',
    };

    const ok = await runSubmit(
      async () => {
        if (editingId) await peopleRepo.update(editingId, payload);
        else await peopleRepo.create(payload);
        reload();
      },
      setErrors,
      toast,
    );
    if (ok) {
      setValues(emptyForm);
      setEditingId(null);
    }
    return ok;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clube"
        title="Pessoas"
        description="Cadastro central do clube. Cada pessoa existe uma única vez e recebe vínculos — jogador, diretoria, comissão — sem duplicar registros."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={openCreate}>
            Nova pessoa
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
        getRowId={(person) => person.id}
        onRowClick={setSelected}
        toolbar={
          <FilterBar
            search={table.search}
            onSearch={table.setSearch}
            searchPlaceholder="Buscar pessoa…"
            filters={[
              {
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'ativo', label: 'Ativo' },
                  { value: 'inativo', label: 'Inativo' },
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
        empty={{
          title: 'Nenhuma pessoa encontrada',
          description: 'Ajuste a busca ou cadastre uma nova pessoa no clube.',
          action: (
            <Button size="sm" icon={<Plus />} onClick={openCreate}>
              Nova pessoa
            </Button>
          ),
        }}
      />

      <Drawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.fullName ?? ''}
        subtitle="Ficha da pessoa"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Fechar
            </Button>
            <Button variant="secondary" onClick={() => selected && openEdit(selected)}>
              Editar cadastro
            </Button>
          </>
        }
      >
        {selected && (
          <div className="divide-y divide-line">
            <DetailSection title="Identificação">
              <DetailList
                items={[
                  { label: 'Nome completo', value: selected.fullName },
                  { label: 'Apelido', value: selected.nickname },
                  { label: 'Nascimento', value: `${formatDate(selected.birthDate)}${age(selected.birthDate) ? ` · ${age(selected.birthDate)} anos` : ''}` },
                  { label: 'Documento', value: selected.document },
                ]}
              />
            </DetailSection>

            <DetailSection title="Contato">
              <DetailList
                items={[
                  { label: 'Telefone', value: selected.phone },
                  { label: 'E-mail', value: selected.email },
                  { label: 'Endereço', value: selected.address, wide: true },
                  { label: 'Cidade', value: selected.city },
                ]}
              />
            </DetailSection>

            <DetailSection title="Vínculos e situação">
              <DetailList
                items={[
                  {
                    label: 'Vínculos',
                    value: (
                      <span className="flex flex-wrap gap-1">
                        {selected.roles.map((role) => (
                          <Badge key={role} tone={role === 'jogador' ? 'gold' : 'neutral'}>
                            {ROLE_LABELS[role]}
                          </Badge>
                        ))}
                      </span>
                    ),
                  },
                  { label: 'Status', value: <StatusBadge status={selected.status} /> },
                  { label: 'Observações', value: selected.notes, wide: true },
                ]}
              />
              <p className="mt-5 rounded-md border border-line bg-surface-sunken px-3.5 py-3 text-2xs leading-relaxed text-ink-faint">
                A conta de acesso é independente do cadastro de pessoa e será
                habilitada na próxima etapa do projeto.
              </p>
            </DetailSection>
          </div>
        )}
      </Drawer>

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title={editingId ? 'Editar pessoa' : 'Nova pessoa'}
        description="O cadastro central alimenta jogadores, diretoria e comissão técnica."
        successMessage={editingId ? 'Cadastro atualizado' : 'Pessoa cadastrada'}
        onSubmit={submit}
      >
        <FormSection title="Identificação">
          <Field label="Nome completo" required error={errors.fullName} className="sm:col-span-2">
            {({ id, invalid }) => (
              <Input
                id={id}
                invalid={invalid}
                value={values.fullName}
                onChange={(event) => setValues({ ...values, fullName: event.target.value })}
                placeholder="Ex.: Thiago Mancuso"
              />
            )}
          </Field>
          <Field label="Apelido">
            {({ id }) => (
              <Input
                id={id}
                value={values.nickname}
                onChange={(event) => setValues({ ...values, nickname: event.target.value })}
                placeholder="Como é chamado no clube"
              />
            )}
          </Field>
          <Field label="Data de nascimento">
            {({ id }) => (
              <DatePicker
                id={id}
                value={values.birthDate}
                onChange={(event) => setValues({ ...values, birthDate: event.target.value })}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Contato">
          <Field label="Telefone">
            {({ id }) => (
              <Input
                id={id}
                value={values.phone}
                onChange={(event) => setValues({ ...values, phone: event.target.value })}
                placeholder="(11) 90000-0000"
              />
            )}
          </Field>
          <Field label="E-mail" error={errors.email}>
            {({ id, invalid }) => (
              <Input
                id={id}
                type="email"
                invalid={invalid}
                value={values.email}
                onChange={(event) => setValues({ ...values, email: event.target.value })}
                placeholder="nome@email.com"
              />
            )}
          </Field>
          <Field label="Documento" hint="CPF ou RG">
            {({ id }) => (
              <Input
                id={id}
                value={values.document}
                onChange={(event) => setValues({ ...values, document: event.target.value })}
              />
            )}
          </Field>
          <Field label="Cidade">
            {({ id }) => (
              <Input
                id={id}
                value={values.city}
                onChange={(event) => setValues({ ...values, city: event.target.value })}
              />
            )}
          </Field>
        </FormSection>

        <FormSection title="Vínculo" columns={1}>
          <Field label="Vínculo principal" hint="Outros vínculos podem ser adicionados depois.">
            {({ id }) => (
              <Select
                id={id}
                value={values.role}
                onChange={(event) => setValues({ ...values, role: event.target.value })}
                options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            )}
          </Field>
          <Field label="Observações">
            {({ id }) => (
              <Textarea
                id={id}
                value={values.notes}
                onChange={(event) => setValues({ ...values, notes: event.target.value })}
                placeholder="Informações relevantes sobre a pessoa"
              />
            )}
          </Field>
        </FormSection>
      </FormModal>
    </PageTransition>
  );
}
