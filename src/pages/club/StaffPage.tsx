import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { FilterBar } from '@/components/data/FilterBar';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DatePicker, Field, Select, Textarea } from '@/components/ui/Field';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { riseItem, staggerContainer } from '@/lib/motion';
import { useAsync } from '@/hooks/useAsync';
import { useToast } from '@/components/ui/Toast';
import { runSubmit } from '@/lib/submit';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useTableState } from '@/hooks/useTableState';
import { peopleRepo, staffRepo } from '@/services';
import { useSession } from '@/app/SessionContext';
import { formatDate } from '@/lib/dates';
import type { StaffMember, StaffRole } from '@/types/domain';

const ROLES: StaffRole[] = ['Treinador', 'Auxiliar Técnico', 'Preparador Físico', 'Preparador de Goleiros', 'Massagista', 'Analista'];

const emptyForm = { personId: '', role: ROLES[0] as string, teamId: '', startDate: '', status: 'ativo', notes: '' };

export default function StaffPage() {
  const { teams } = useSession();
  const { data, status, reload } = useAsync(() => staffRepo.list(), []);
  const people = useAsync(() => peopleRepo.list(), []);
  const form = useDisclosure();
  const toast = useToast();
  const [values, setValues] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const table = useTableState<StaffMember>(data, ['name', 'role', 'team'], { pageSize: 12 });

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!values.personId) nextErrors.personId = 'Selecione a pessoa.';
    if (!values.startDate) nextErrors.startDate = 'Informe a data de início.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;

    const ok = await runSubmit(
      async () => {
        await staffRepo.create({
          personId: values.personId,
          role: values.role,
          teamId: values.teamId || null,
          startDate: values.startDate,
          status: values.status,
          notes: values.notes,
        });
        reload();
      },
      setErrors,
      toast,
    );
    if (ok) setValues(emptyForm);
    return ok;
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Clube"
        title="Comissão Técnica"
        description="Profissionais responsáveis pela preparação das equipes, por categoria e período de atuação."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={form.open}>
            Novo profissional
          </Button>
        }
      />

      <div className="mb-5">
        <FilterBar
          search={table.search}
          onSearch={table.setSearch}
          searchPlaceholder="Buscar profissional…"
          filters={[
            { key: 'team', label: 'Equipe', options: teams.map((team) => ({ value: team.name, label: team.name })) },
            { key: 'role', label: 'Função', options: ROLES.map((role) => ({ value: role, label: role })) },
          ]}
          values={table.filters}
          onFilter={table.setFilter}
          onReset={table.resetFilters}
          activeCount={table.activeFilterCount}
        />
      </div>

      {status === 'loading' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[152px] rounded-lg" />
          ))}
        </div>
      ) : table.rows.length === 0 ? (
        <div className="rounded-lg border border-line bg-graphite">
          <EmptyState
            compact
            title="Nenhum profissional encontrado"
            description="Ajuste os filtros ou cadastre um novo integrante da comissão."
          />
        </div>
      ) : (
        <motion.ul
          variants={staggerContainer(0.05)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {table.rows.map((member) => (
            <motion.li
              key={member.id}
              variants={riseItem}
              whileHover={{ y: -2 }}
              className="rounded-lg border border-line bg-graphite p-5 transition-colors duration-200 hover:border-line-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <Avatar name={member.name} size="lg" tone={member.role === 'Treinador' ? 'gold' : 'neutral'} />
                <StatusBadge status={member.status} />
              </div>
              <p className="mt-4 font-heading text-[15px] font-medium tracking-editorial text-ink">{member.name}</p>
              <p className="mt-1 text-[13px] text-ink-muted">{member.role}</p>
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                <Badge tone={member.team === 'Profissional' ? 'gold' : 'neutral'}>{member.team}</Badge>
                <span className="text-2xs text-ink-faint">desde {formatDate(member.startDate)}</span>
              </div>
              {member.notes && <p className="mt-3 text-2xs leading-relaxed text-ink-faint">{member.notes}</p>}
            </motion.li>
          ))}
        </motion.ul>
      )}

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Novo integrante da comissão"
        description="Vincule uma pessoa já cadastrada a uma função técnica."
        successMessage="Profissional registrado"
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
                options={(people.data ?? []).map((person) => ({ value: person.id, label: person.fullName }))}
              />
            )}
          </Field>
          <Field label="Função" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.role}
                onChange={(event) => setValues({ ...values, role: event.target.value })}
                options={ROLES.map((role) => ({ value: role, label: role }))}
              />
            )}
          </Field>
          <Field label="Equipe / categoria" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.teamId}
                placeholder="Selecione a categoria"
                onChange={(event) => setValues({ ...values, teamId: event.target.value })}
                options={teams.map((team) => ({ value: team.id, label: team.name }))}
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
