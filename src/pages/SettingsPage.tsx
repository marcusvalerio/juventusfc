import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Save, Trash2, X } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { Wordmark } from '@/components/brand/Wordmark';
import { useToast } from '@/components/ui/Toast';
import { FormModal, FormSection } from '@/components/data/FormModal';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { useDisclosure } from '@/hooks/useDisclosure';
import { useAsync } from '@/hooks/useAsync';
import { useSession } from '@/app/SessionContext';
import { apiFetch, ApiError } from '@/services/api';
import { peopleRepo } from '@/services';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/dates';
import { PERMISSION_GROUPS } from '@/shared/permissions';
import type { AccountSummary } from '@/types/domain';

const PAYMENT_OPTIONS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto'];

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-graphite">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div className="min-w-0">
          <h3 className="font-heading text-[15px] font-medium tracking-editorial text-ink">{title}</h3>
          {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {action}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

/** Checkbox grid over the shared permission catalogue. */
function PermissionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (permission: string) =>
    onChange(
      value.includes(permission)
        ? value.filter((item) => item !== permission)
        : [...value, permission],
    );

  return (
    <div className="flex flex-col gap-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.module} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
          <p className="mb-2.5 text-[13px] text-ink">{group.label}</p>
          <div className="flex flex-wrap gap-2">
            {group.actions.map((action) => {
              const permission = `${group.module}.${action.key}`;
              const active = value.includes(permission);
              return (
                <button
                  key={permission}
                  type="button"
                  onClick={() => toggle(permission)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-2xs transition-colors duration-150',
                    active
                      ? 'border-line-gold bg-gold-wash text-gold-light'
                      : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { club, settings, teams, account, can, refreshClub } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState('clube');
  const [saving, setSaving] = useState(false);
  const canEdit = can('settings.edit');

  const [clubForm, setClubForm] = useState({
    officialName: '', shortName: '', city: '', state: '', country: '', foundedYear: '',
    venue: '', address: '', phone: '', email: '', website: '', social: '',
    primaryColor: '', secondaryColor: '',
  });
  const [financeForm, setFinanceForm] = useState({
    defaultMonthlyFee: '0', defaultDueDay: '10', paymentMethods: [] as string[],
    season: '', lowStockAlerts: true, dueReminders: true,
  });
  const [teamDraft, setTeamDraft] = useState('');

  // Local UI preferences stay on the device; they are not club data.
  const [preferences, setPreferences] = useState(() => ({
    denseTables: localStorage.getItem('juventus:dense') === '1',
    showValues: localStorage.getItem('juventus:hide-values') !== '1',
  }));

  useEffect(() => {
    if (club) {
      setClubForm({
        officialName: club.officialName, shortName: club.shortName, city: club.city,
        state: club.state, country: club.country, foundedYear: club.foundedYear,
        venue: club.venue, address: club.address, phone: club.phone, email: club.email,
        website: club.website, social: club.social,
        primaryColor: club.primaryColor || '#08090B',
        secondaryColor: club.secondaryColor || '#C9A227',
      });
    }
    if (settings) {
      setFinanceForm({
        defaultMonthlyFee: String(settings.defaultMonthlyFee),
        defaultDueDay: String(settings.defaultDueDay),
        paymentMethods: settings.paymentMethods,
        season: settings.season,
        lowStockAlerts: settings.lowStockAlerts,
        dueReminders: settings.dueReminders,
      });
    }
  }, [club, settings]);

  const saveClub = async () => {
    setSaving(true);
    try {
      await apiFetch('/club', { method: 'PUT', body: clubForm });
      await refreshClub();
      toast.success('Dados do clube salvos');
    } catch (cause) {
      toast.error('Não foi possível salvar', cause instanceof ApiError ? cause.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiFetch('/club/settings', {
        method: 'PUT',
        body: {
          defaultMonthlyFee: Number(financeForm.defaultMonthlyFee) || 0,
          defaultDueDay: Number(financeForm.defaultDueDay) || 10,
          paymentMethods: financeForm.paymentMethods,
          season: financeForm.season,
          lowStockAlerts: financeForm.lowStockAlerts,
          dueReminders: financeForm.dueReminders,
        },
      });
      await refreshClub();
      toast.success('Parâmetros salvos');
    } catch (cause) {
      toast.error('Não foi possível salvar', cause instanceof ApiError ? cause.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  const addTeam = async () => {
    const name = teamDraft.trim();
    if (!name) return;
    try {
      await apiFetch('/club/teams', { method: 'POST', body: { name } });
      await refreshClub();
      setTeamDraft('');
      toast.success('Categoria adicionada');
    } catch (cause) {
      toast.error('Não foi possível adicionar', cause instanceof ApiError ? cause.message : undefined);
    }
  };

  const removeTeam = async (id: string) => {
    try {
      await apiFetch(`/club/teams/${id}`, { method: 'DELETE' });
      await refreshClub();
      toast.success('Categoria removida');
    } catch (cause) {
      toast.error('Não foi possível remover', cause instanceof ApiError ? cause.message : undefined);
    }
  };

  const tabs = [
    { value: 'clube', label: 'Clube' },
    { value: 'estrutura', label: 'Estrutura' },
    { value: 'geral', label: 'Geral' },
    { value: 'interface', label: 'Interface' },
    ...(can('accounts.view') ? [{ value: 'acesso', label: 'Acesso' }] : []),
  ];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Gestão"
        title="Configurações"
        description="Informações institucionais, estrutura esportiva, parâmetros do clube e contas de acesso."
        actions={
          canEdit && (tab === 'clube' || tab === 'geral') ? (
            <Button
              variant="primary"
              icon={<Save />}
              loading={saving}
              onClick={tab === 'clube' ? saveClub : saveSettings}
            >
              Salvar alterações
            </Button>
          ) : undefined
        }
      />

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6" />

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="flex flex-col gap-4"
      >
        {tab === 'clube' && (
          <>
            <Panel title="Identidade" description="Como o clube aparece na plataforma.">
              <div className="mb-6 flex flex-wrap items-center gap-5 rounded-md border border-line bg-surface-sunken px-5 py-4">
                <Wordmark size="lg" name={clubForm.shortName} />
                <p className="text-2xs leading-relaxed text-ink-faint">
                  A marca usa Sentient nos elementos institucionais.
                  <br />
                  O envio do escudo será liberado com o armazenamento de arquivos.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nome oficial">
                  {({ id }) => (
                    <Input id={id} value={clubForm.officialName} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, officialName: e.target.value })} />
                  )}
                </Field>
                <Field label="Nome curto">
                  {({ id }) => (
                    <Input id={id} value={clubForm.shortName} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, shortName: e.target.value })} />
                  )}
                </Field>
                <Field label="Ano de fundação">
                  {({ id }) => (
                    <Input id={id} value={clubForm.foundedYear} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, foundedYear: e.target.value })} />
                  )}
                </Field>
                <Field label="Praça esportiva">
                  {({ id }) => (
                    <Input id={id} value={clubForm.venue} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, venue: e.target.value })} />
                  )}
                </Field>
                <Field label="Cidade">
                  {({ id }) => (
                    <Input id={id} value={clubForm.city} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, city: e.target.value })} />
                  )}
                </Field>
                <Field label="Estado">
                  {({ id }) => (
                    <Input id={id} value={clubForm.state} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, state: e.target.value })} />
                  )}
                </Field>
                <Field label="País">
                  {({ id }) => (
                    <Input id={id} value={clubForm.country} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, country: e.target.value })} />
                  )}
                </Field>
                <Field label="Endereço">
                  {({ id }) => (
                    <Input id={id} value={clubForm.address} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, address: e.target.value })} />
                  )}
                </Field>
              </div>
            </Panel>

            <Panel title="Contato e cores" description="Dados usados em comunicados e na identidade visual.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Telefone">
                  {({ id }) => (
                    <Input id={id} value={clubForm.phone} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, phone: e.target.value })} />
                  )}
                </Field>
                <Field label="E-mail">
                  {({ id }) => (
                    <Input id={id} type="email" value={clubForm.email} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, email: e.target.value })} />
                  )}
                </Field>
                <Field label="Website">
                  {({ id }) => (
                    <Input id={id} value={clubForm.website} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, website: e.target.value })} />
                  )}
                </Field>
                <Field label="Rede social">
                  {({ id }) => (
                    <Input id={id} value={clubForm.social} disabled={!canEdit}
                      onChange={(e) => setClubForm({ ...clubForm, social: e.target.value })} />
                  )}
                </Field>
                <Field label="Cor principal">
                  {({ id }) => (
                    <div className="flex items-center gap-3">
                      <input id={id} type="color" value={clubForm.primaryColor} disabled={!canEdit}
                        onChange={(e) => setClubForm({ ...clubForm, primaryColor: e.target.value })}
                        className="h-9 w-14 cursor-pointer rounded border border-line-strong bg-surface-sunken" />
                      <Input value={clubForm.primaryColor} disabled={!canEdit}
                        onChange={(e) => setClubForm({ ...clubForm, primaryColor: e.target.value })} />
                    </div>
                  )}
                </Field>
                <Field label="Cor secundária">
                  {({ id }) => (
                    <div className="flex items-center gap-3">
                      <input id={id} type="color" value={clubForm.secondaryColor} disabled={!canEdit}
                        onChange={(e) => setClubForm({ ...clubForm, secondaryColor: e.target.value })}
                        className="h-9 w-14 cursor-pointer rounded border border-line-strong bg-surface-sunken" />
                      <Input value={clubForm.secondaryColor} disabled={!canEdit}
                        onChange={(e) => setClubForm({ ...clubForm, secondaryColor: e.target.value })} />
                    </div>
                  )}
                </Field>
                <Field label="Observações internas" className="sm:col-span-2">
                  {({ id }) => <Textarea id={id} placeholder="Notas visíveis apenas para a administração" />}
                </Field>
              </div>
            </Panel>
          </>
        )}

        {tab === 'estrutura' && (
          <Panel
            title="Categorias e equipes"
            description="Usadas em jogadores, jogos, treinos e campeonatos."
          >
            {canEdit && (
              <div className="mb-5 flex gap-2">
                <Input
                  value={teamDraft}
                  onChange={(e) => setTeamDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void addTeam();
                    }
                  }}
                  placeholder="Ex.: Sub-15"
                  className="max-w-xs"
                />
                <Button variant="secondary" icon={<Plus />} onClick={addTeam}>
                  Adicionar
                </Button>
              </div>
            )}

            {teams.length === 0 ? (
              <EmptyState
                compact
                title="Nenhuma categoria cadastrada"
                description="Adicione ao menos uma categoria para organizar o elenco."
              />
            ) : (
              <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
                {teams.map((team) => (
                  <li key={team.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-[13px] text-ink">{team.name}</span>
                    {canEdit && (
                      <IconButton
                        label={`Remover ${team.name}`}
                        onClick={() => removeTeam(team.id)}
                        className="h-7 w-7 hover:text-danger"
                      >
                        <X />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
              Ao remover uma categoria, os registros vinculados a ela continuam existindo e passam a
              ficar sem categoria.
            </p>
          </Panel>
        )}

        {tab === 'geral' && (
          <>
            <Panel title="Parâmetros financeiros" description="Valores sugeridos ao criar novos registros.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Mensalidade padrão">
                  {({ id }) => (
                    <Input id={id} type="number" min={0} step="10" disabled={!canEdit}
                      value={financeForm.defaultMonthlyFee}
                      onChange={(e) => setFinanceForm({ ...financeForm, defaultMonthlyFee: e.target.value })} />
                  )}
                </Field>
                <Field label="Dia padrão de vencimento">
                  {({ id }) => (
                    <Input id={id} type="number" min={1} max={31} disabled={!canEdit}
                      value={financeForm.defaultDueDay}
                      onChange={(e) => setFinanceForm({ ...financeForm, defaultDueDay: e.target.value })} />
                  )}
                </Field>
                <Field label="Temporada vigente">
                  {({ id }) => (
                    <Input id={id} value={financeForm.season} disabled={!canEdit}
                      onChange={(e) => setFinanceForm({ ...financeForm, season: e.target.value })} />
                  )}
                </Field>
                <Field label="Moeda">
                  {({ id }) => (
                    <Select id={id} value={settings?.currency ?? 'BRL'} disabled
                      options={[{ value: 'BRL', label: 'Real (R$)' }]} onChange={() => {}} />
                  )}
                </Field>
                <div className="sm:col-span-2">
                  <p className="mb-3 text-[13px] font-medium text-ink-muted">Formas de pagamento aceitas</p>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_OPTIONS.map((method) => {
                      const active = financeForm.paymentMethods.includes(method);
                      return (
                        <button
                          key={method}
                          type="button"
                          disabled={!canEdit}
                          onClick={() =>
                            setFinanceForm({
                              ...financeForm,
                              paymentMethods: active
                                ? financeForm.paymentMethods.filter((item) => item !== method)
                                : [...financeForm.paymentMethods, method],
                            })
                          }
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-2xs transition-colors duration-150 disabled:opacity-50',
                            active
                              ? 'border-line-gold bg-gold-wash text-gold-light'
                              : 'border-line text-ink-muted hover:border-line-strong hover:text-ink',
                          )}
                        >
                          {method}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title="Alertas" description="Avisos exibidos no painel da administração.">
              <div className="divide-y divide-line">
                <Switch
                  label="Alertas de estoque baixo"
                  description="Destaca itens abaixo do mínimo no dashboard."
                  checked={financeForm.lowStockAlerts}
                  disabled={!canEdit}
                  onChange={(value) => setFinanceForm({ ...financeForm, lowStockAlerts: value })}
                />
                <Switch
                  label="Lembretes de mensalidade"
                  description="Sinaliza cobranças vencidas e a vencer."
                  checked={financeForm.dueReminders}
                  disabled={!canEdit}
                  onChange={(value) => setFinanceForm({ ...financeForm, dueReminders: value })}
                />
              </div>
            </Panel>
          </>
        )}

        {tab === 'interface' && (
          <Panel title="Preferências de interface" description="Ajustes que valem apenas neste dispositivo.">
            <div className="divide-y divide-line">
              <Switch
                label="Tabelas compactas"
                description="Diminui o espaçamento das linhas para exibir mais registros por tela."
                checked={preferences.denseTables}
                onChange={(value) => {
                  setPreferences({ ...preferences, denseTables: value });
                  localStorage.setItem('juventus:dense', value ? '1' : '0');
                }}
              />
              <Switch
                label="Exibir valores financeiros"
                description="Oculte os valores ao apresentar a plataforma em tela compartilhada."
                checked={preferences.showValues}
                onChange={(value) => {
                  setPreferences({ ...preferences, showValues: value });
                  localStorage.setItem('juventus:hide-values', value ? '0' : '1');
                }}
              />
            </div>
            <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
              Estas preferências ficam salvas no navegador e não afetam outros usuários.
            </p>
          </Panel>
        )}

        {tab === 'acesso' && <AccountsPanel currentAccountId={account?.id} />}
      </motion.div>
    </PageTransition>
  );
}

/* ------------------------------------------------------------- accounts */

function AccountsPanel({ currentAccountId }: { currentAccountId?: string }) {
  const { can } = useSession();
  const toast = useToast();
  const form = useDisclosure();
  const canManage = can('accounts.manage');

  const accounts = useAsync(async () => {
    const result = await apiFetch<{ data: AccountSummary[] }>('/accounts');
    return result.data;
  }, []);
  const people = useAsync(() => peopleRepo.list(), []);

  const [values, setValues] = useState({ personId: '', username: '', password: '', permissions: [] as string[] });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<AccountSummary | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

  const createAccount = async () => {
    const next: Record<string, string> = {};
    if (!values.personId) next.personId = 'Selecione a pessoa.';
    if (values.username.trim().length < 3) next.username = 'Informe um usuário com ao menos 3 caracteres.';
    if (values.password.length < 8) next.password = 'A senha precisa ter ao menos 8 caracteres.';
    setErrors(next);
    if (Object.keys(next).length > 0) return false;

    try {
      await apiFetch('/accounts', { method: 'POST', body: values });
      accounts.reload();
      setValues({ personId: '', username: '', password: '', permissions: [] });
      return true;
    } catch (cause) {
      if (cause instanceof ApiError) {
        setErrors(cause.details ?? { username: cause.message });
        toast.error('Não foi possível criar a conta', cause.message);
      }
      return false;
    }
  };

  const savePermissions = async () => {
    if (!editing) return;
    try {
      await apiFetch(`/accounts/${editing.id}/permissions`, {
        method: 'PUT',
        body: { permissions: editingPermissions },
      });
      accounts.reload();
      setEditing(null);
      toast.success('Autorizações atualizadas');
    } catch (cause) {
      toast.error('Não foi possível salvar', cause instanceof ApiError ? cause.message : undefined);
    }
  };

  const removeAccount = async (item: AccountSummary) => {
    try {
      await apiFetch(`/accounts/${item.id}`, { method: 'DELETE' });
      accounts.reload();
      toast.success('Conta removida');
    } catch (cause) {
      toast.error('Não foi possível remover', cause instanceof ApiError ? cause.message : undefined);
    }
  };

  const peopleWithoutAccount = (people.data ?? []).filter((person) => !person.hasAccount);

  return (
    <>
      <Panel
        title="Contas de acesso"
        description="Cada conta pertence a uma pessoa e recebe autorizações individuais."
        action={
          canManage ? (
            <Button variant="primary" size="sm" icon={<Plus />} onClick={form.open}>
              Nova conta
            </Button>
          ) : undefined
        }
      >
        {accounts.status === 'loading' ? (
          <LoadingState label="Carregando contas" />
        ) : (accounts.data ?? []).length === 0 ? (
          <EmptyState compact title="Nenhuma conta cadastrada" />
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-md border border-line">
            {(accounts.data ?? []).map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] text-ink">
                    {item.name}
                    {item.isOwner && <Badge tone="gold">Proprietária</Badge>}
                    {item.id === currentAccountId && <Badge tone="muted">Você</Badge>}
                  </p>
                  <p className="mt-0.5 text-2xs text-ink-faint">
                    @{item.username} ·{' '}
                    {item.isOwner
                      ? 'todas as autorizações'
                      : `${item.permissions.length} autorizações`}
                    {item.lastLoginAt && ` · último acesso em ${formatDate(item.lastLoginAt.slice(0, 10))}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  {canManage && !item.isOwner && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(item);
                          setEditingPermissions(item.permissions);
                        }}
                      >
                        Autorizações
                      </Button>
                      {item.id !== currentAccountId && (
                        <IconButton
                          label={`Remover conta de ${item.name}`}
                          onClick={() => removeAccount(item)}
                          className="h-7 w-7 hover:text-danger"
                        >
                          <Trash2 />
                        </IconButton>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <FormModal
        open={form.isOpen}
        onClose={form.close}
        title="Nova conta de acesso"
        description="A conta é vinculada a uma pessoa já cadastrada."
        successMessage="Conta criada"
        onSubmit={createAccount}
      >
        <FormSection title="Identificação">
          <Field label="Pessoa" required error={errors.personId}>
            {({ id, invalid }) => (
              <Select
                id={id}
                invalid={invalid}
                value={values.personId}
                placeholder={
                  peopleWithoutAccount.length === 0 ? 'Todas as pessoas já têm conta' : 'Selecione a pessoa'
                }
                onChange={(e) => setValues({ ...values, personId: e.target.value })}
                options={peopleWithoutAccount.map((person) => ({ value: person.id, label: person.fullName }))}
              />
            )}
          </Field>
          <Field label="Usuário" required error={errors.username}>
            {({ id, invalid }) => (
              <Input id={id} invalid={invalid} value={values.username} autoComplete="off"
                onChange={(e) => setValues({ ...values, username: e.target.value })} />
            )}
          </Field>
          <Field label="Senha" required error={errors.password} hint="Mínimo de 8 caracteres, com letras e números.">
            {({ id, invalid }) => (
              <Input id={id} type="password" invalid={invalid} value={values.password} autoComplete="new-password"
                onChange={(e) => setValues({ ...values, password: e.target.value })} />
            )}
          </Field>
        </FormSection>

        <FormSection title="Autorizações" columns={1}>
          <PermissionPicker
            value={values.permissions}
            onChange={(permissions) => setValues({ ...values, permissions })}
          />
        </FormSection>
      </FormModal>

      <FormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={`Autorizações de ${editing?.name ?? ''}`}
        description="Define exatamente o que esta conta pode ver e fazer."
        successMessage="Autorizações atualizadas"
        onSubmit={savePermissions}
      >
        <FormSection title="Permissões" columns={1}>
          <PermissionPicker value={editingPermissions} onChange={setEditingPermissions} />
        </FormSection>
      </FormModal>
    </>
  );
}
