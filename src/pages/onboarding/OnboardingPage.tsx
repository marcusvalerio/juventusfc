import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/app/SessionContext';
import { apiFetch, ApiError } from '@/services/api';
import { SUGGESTED_TEAMS } from '@/types/domain';
import { PublicScreen } from '@/layouts/PublicScreen';

const STEPS = [
  { key: 'clube', title: 'Identidade do clube', hint: 'Como o clube se apresenta na plataforma.' },
  { key: 'estrutura', title: 'Estrutura esportiva', hint: 'Categorias e equipes que o clube mantém.' },
  { key: 'financeiro', title: 'Financeiro', hint: 'Padrões usados ao criar mensalidades.' },
  { key: 'visual', title: 'Identidade visual', hint: 'Cores institucionais e escudo.' },
  { key: 'admin', title: 'Primeiro administrador', hint: 'A conta que vai gerir o sistema.' },
] as const;

const PAYMENT_OPTIONS = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Boleto'];

const emptyForm = {
  officialName: '',
  shortName: '',
  city: '',
  state: '',
  country: 'Brasil',
  foundedYear: '',
  venue: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  social: '',
  teams: [...SUGGESTED_TEAMS.slice(0, 3)] as string[],
  plannedPlayers: '',
  defaultMonthlyFee: '150',
  defaultDueDay: '10',
  paymentMethods: ['Pix', 'Dinheiro'] as string[],
  season: String(new Date().getFullYear()),
  primaryColor: '#08090B',
  secondaryColor: '#C9A227',
  adminName: '',
  adminUsername: '',
  adminPhone: '',
  adminEmail: '',
  password: '',
  confirmPassword: '',
};

type Form = typeof emptyForm;
type Errors = Partial<Record<keyof Form, string>>;

/**
 * First-run setup. Reachable only while no club exists; the API refuses a second
 * run, so a stale tab cannot create a duplicate organisation.
 */
export default function OnboardingPage() {
  const { needsOnboarding, account, refreshBootstrap } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [teamDraft, setTeamDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  // Guard placed after every hook, so the hook order never changes between renders.
  // Rendered inside BootstrapGate, so `needsOnboarding` is already known and this
  // never fires on a clean install that simply had not answered yet.
  if (!needsOnboarding) {
    return (
      <PublicScreen eyebrow="Configuração concluída" title="Clube já configurado">
        <div className="rounded-lg border border-line bg-graphite p-6 text-center">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Esta instalação já foi configurada e não pode receber um segundo clube.
            {account
              ? ' Você já está autenticado.'
              : ' Entre com a sua conta para continuar.'}
          </p>
          <Button
            variant="primary"
            size="lg"
            iconRight={<ArrowRight />}
            className="mt-6 w-full"
            onClick={() => navigate(account ? '/app' : '/entrar', { replace: true })}
          >
            {account ? 'Ir para a plataforma' : 'Ir para o login'}
          </Button>
        </div>
        <p className="mt-6 text-center text-2xs leading-relaxed text-ink-ghost">
          Precisa de acesso? Peça à administração que crie a sua conta.
        </p>
      </PublicScreen>
    );
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validateStep = (index: number): boolean => {
    const next: Errors = {};

    if (index === 0) {
      if (!form.officialName.trim()) next.officialName = 'Informe o nome oficial do clube.';
      if (!form.shortName.trim()) next.shortName = 'Informe o nome curto.';
      if (form.foundedYear && !/^\d{4}$/.test(form.foundedYear)) {
        next.foundedYear = 'Use um ano com quatro dígitos.';
      }
      if (form.email && !form.email.includes('@')) next.email = 'E-mail inválido.';
    }

    if (index === 1 && form.teams.length === 0) {
      next.teams = 'Cadastre ao menos uma categoria.';
    }

    if (index === 2) {
      const day = Number(form.defaultDueDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        next.defaultDueDay = 'Use um dia entre 1 e 31.';
      }
      if (Number(form.defaultMonthlyFee) < 0) {
        next.defaultMonthlyFee = 'Informe um valor válido.';
      }
    }

    if (index === 4) {
      if (!form.adminName.trim()) next.adminName = 'Informe o nome do administrador.';
      if (!/^[a-zA-Z0-9._-]{3,40}$/.test(form.adminUsername)) {
        next.adminUsername = 'Use de 3 a 40 caracteres: letras, números, ponto, hífen ou sublinhado.';
      }
      if (form.password.length < 8) {
        next.password = 'A senha precisa ter ao menos 8 caracteres.';
      } else if (!/[a-zA-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
        next.password = 'A senha precisa conter letras e números.';
      }
      if (form.password !== form.confirmPassword) {
        next.confirmPassword = 'As senhas não conferem.';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else void submit();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await apiFetch('/onboarding', {
        method: 'POST',
        body: {
          club: {
            officialName: form.officialName.trim(),
            shortName: form.shortName.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            country: form.country.trim(),
            foundedYear: form.foundedYear.trim(),
            venue: form.venue.trim(),
            address: form.address.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            website: form.website.trim(),
            social: form.social.trim(),
            primaryColor: form.primaryColor,
            secondaryColor: form.secondaryColor,
          },
          teams: form.teams,
          finance: {
            defaultMonthlyFee: Number(form.defaultMonthlyFee) || 0,
            defaultDueDay: Number(form.defaultDueDay) || 10,
            paymentMethods: form.paymentMethods,
            season: form.season.trim(),
          },
          admin: {
            fullName: form.adminName.trim(),
            username: form.adminUsername.trim(),
            password: form.password,
            confirmPassword: form.confirmPassword,
            phone: form.adminPhone.trim(),
            email: form.adminEmail.trim(),
          },
        },
      });

      await refreshBootstrap();
      toast.success('Configuração concluída', 'Bem-vindo à plataforma.');
      navigate('/app', { replace: true });
    } catch (cause) {
      if (cause instanceof ApiError && cause.details) {
        // Server-side field errors are mapped back onto the form.
        const mapped: Errors = {};
        // Server paths like "admin.username" map onto this form's flat field names.
        const FIELD_BY_PATH: Record<string, keyof Form> = {
          username: 'adminUsername',
          fullName: 'adminName',
          password: 'password',
          confirmPassword: 'confirmPassword',
        };
        for (const [path, message] of Object.entries(cause.details)) {
          const leaf = path.split('.').pop() ?? '';
          const key = FIELD_BY_PATH[leaf] ?? (leaf as keyof Form);
          if (key in emptyForm) mapped[key] = message;
        }
        setErrors(mapped);
        setStep(Object.keys(mapped).length > 0 ? 4 : step);
      }
      toast.error(
        'Não foi possível concluir',
        cause instanceof ApiError ? cause.message : 'Tente novamente em instantes.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const addTeam = () => {
    const name = teamDraft.trim();
    if (!name || form.teams.includes(name)) return;
    set('teams', [...form.teams, name]);
    setTeamDraft('');
  };

  return (
    <div className="grain relative min-h-screen overflow-hidden bg-onyx">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent"
      />

      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-6 py-10 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-4">
          <span className="flex items-center gap-3">
            <Crest className="h-8" />
            <span className="font-display text-[15px] tracking-editorial text-ink">
              Configuração inicial
            </span>
          </span>
          <span className="tabular text-2xs text-ink-faint">
            Etapa {step + 1} de {STEPS.length}
          </span>
        </header>

        <div className="mb-8">
          <div className="h-px w-full bg-line">
            <motion.div
              className="h-px bg-gold"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: DUR.slow, ease: EASE }}
            />
          </div>
          <ol className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
            {STEPS.map((item, index) => (
              <li
                key={item.key}
                className={cn(
                  'flex items-center gap-1.5 text-2xs transition-colors duration-200',
                  index === step ? 'text-gold' : index < step ? 'text-ink-muted' : 'text-ink-ghost',
                )}
              >
                {index < step ? (
                  <Check className="h-3 w-3" aria-hidden />
                ) : (
                  <span className="tabular">{String(index + 1).padStart(2, '0')}</span>
                )}
                {item.title}
              </li>
            ))}
          </ol>
        </div>

        <AnimatePresence mode="wait">
          <motion.section
            key={STEPS[step].key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DUR.slow, ease: EASE }}
            className="flex-1"
          >
            <h1 className="font-heading text-[26px] font-medium leading-tight tracking-tightest text-ink">
              {STEPS[step].title}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{STEPS[step].hint}</p>

            <div className="mt-8 rounded-lg border border-line bg-graphite p-6">
              {step === 0 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nome oficial" required error={errors.officialName} className="sm:col-span-2">
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.officialName}
                        onChange={(e) => set('officialName', e.target.value)}
                        placeholder="Ex.: Juventus Futebol Clube" autoFocus />
                    )}
                  </Field>
                  <Field label="Nome curto" required error={errors.shortName} hint="Usado no cabeçalho e nos jogos.">
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.shortName}
                        onChange={(e) => set('shortName', e.target.value)} placeholder="Ex.: Juventus F.C." />
                    )}
                  </Field>
                  <Field label="Ano de fundação" error={errors.foundedYear}>
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.foundedYear} inputMode="numeric"
                        onChange={(e) => set('foundedYear', e.target.value)} placeholder="1934" />
                    )}
                  </Field>
                  <Field label="Cidade">
                    {({ id }) => (
                      <Input id={id} value={form.city} onChange={(e) => set('city', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Estado">
                    {({ id }) => (
                      <Input id={id} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="SP" />
                    )}
                  </Field>
                  <Field label="País">
                    {({ id }) => (
                      <Input id={id} value={form.country} onChange={(e) => set('country', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Estádio ou campo principal">
                    {({ id }) => (
                      <Input id={id} value={form.venue} onChange={(e) => set('venue', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Endereço" className="sm:col-span-2">
                    {({ id }) => (
                      <Input id={id} value={form.address} onChange={(e) => set('address', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Telefone">
                    {({ id }) => (
                      <Input id={id} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(11) 90000-0000" />
                    )}
                  </Field>
                  <Field label="E-mail" error={errors.email}>
                    {({ id, invalid }) => (
                      <Input id={id} type="email" invalid={invalid} value={form.email}
                        onChange={(e) => set('email', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Website">
                    {({ id }) => (
                      <Input id={id} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="clube.com.br" />
                    )}
                  </Field>
                  <Field label="Rede social">
                    {({ id }) => (
                      <Input id={id} value={form.social} onChange={(e) => set('social', e.target.value)} placeholder="@clube" />
                    )}
                  </Field>
                </div>
              )}

              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <Field label="Categorias e equipes" required error={errors.teams}>
                      {({ id, invalid }) => (
                        <div className="flex gap-2">
                          <Input
                            id={id}
                            invalid={invalid}
                            value={teamDraft}
                            onChange={(e) => setTeamDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTeam();
                              }
                            }}
                            placeholder="Ex.: Profissional"
                          />
                          <Button variant="secondary" icon={<Plus />} onClick={addTeam}>
                            Adicionar
                          </Button>
                        </div>
                      )}
                    </Field>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {form.teams.map((team) => (
                        <span
                          key={team}
                          className="inline-flex items-center gap-2 rounded-full border border-line-gold bg-gold-wash px-3 py-1 text-2xs text-gold-light"
                        >
                          {team}
                          <button
                            type="button"
                            aria-label={`Remover ${team}`}
                            onClick={() => set('teams', form.teams.filter((item) => item !== team))}
                            className="text-gold-light/70 transition-colors hover:text-gold-light"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {form.teams.length === 0 && (
                        <p className="text-2xs text-ink-ghost">Nenhuma categoria adicionada.</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-line pt-5">
                    <Field
                      label="Quantos jogadores pretende cadastrar?"
                      hint="Serve apenas para orientar a configuração. O número exibido no sistema é sempre calculado a partir dos jogadores realmente cadastrados."
                    >
                      {({ id }) => (
                        <Input id={id} type="number" min={0} value={form.plannedPlayers}
                          onChange={(e) => set('plannedPlayers', e.target.value)} placeholder="Ex.: 22" />
                      )}
                    </Field>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Mensalidade padrão" error={errors.defaultMonthlyFee} hint="Sugerida ao cadastrar um jogador.">
                    {({ id, invalid }) => (
                      <Input id={id} type="number" min={0} step="10" invalid={invalid}
                        value={form.defaultMonthlyFee} onChange={(e) => set('defaultMonthlyFee', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Dia padrão de vencimento" error={errors.defaultDueDay}>
                    {({ id, invalid }) => (
                      <Input id={id} type="number" min={1} max={31} invalid={invalid}
                        value={form.defaultDueDay} onChange={(e) => set('defaultDueDay', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Temporada vigente">
                    {({ id }) => (
                      <Input id={id} value={form.season} onChange={(e) => set('season', e.target.value)} />
                    )}
                  </Field>
                  <div className="sm:col-span-2">
                    <p className="mb-3 text-[13px] font-medium text-ink-muted">Formas de pagamento aceitas</p>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_OPTIONS.map((method) => {
                        const active = form.paymentMethods.includes(method);
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() =>
                              set(
                                'paymentMethods',
                                active
                                  ? form.paymentMethods.filter((item) => item !== method)
                                  : [...form.paymentMethods, method],
                              )
                            }
                            className={cn(
                              'rounded-full border px-3 py-1.5 text-2xs transition-colors duration-150',
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
              )}

              {step === 3 && (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Cor principal">
                      {({ id }) => (
                        <div className="flex items-center gap-3">
                          <input
                            id={id}
                            type="color"
                            value={form.primaryColor}
                            onChange={(e) => set('primaryColor', e.target.value)}
                            className="h-9 w-14 cursor-pointer rounded border border-line-strong bg-surface-sunken"
                          />
                          <Input value={form.primaryColor} onChange={(e) => set('primaryColor', e.target.value)} />
                        </div>
                      )}
                    </Field>
                    <Field label="Cor secundária">
                      {({ id }) => (
                        <div className="flex items-center gap-3">
                          <input
                            id={id}
                            type="color"
                            value={form.secondaryColor}
                            onChange={(e) => set('secondaryColor', e.target.value)}
                            className="h-9 w-14 cursor-pointer rounded border border-line-strong bg-surface-sunken"
                          />
                          <Input value={form.secondaryColor} onChange={(e) => set('secondaryColor', e.target.value)} />
                        </div>
                      )}
                    </Field>
                  </div>

                  <div className="flex items-start gap-4 rounded-md border border-line bg-surface-sunken px-4 py-4">
                    <Crest className="h-10 shrink-0" />
                    <div>
                      <p className="text-[13px] text-ink">Escudo do clube</p>
                      <p className="mt-1 text-2xs leading-relaxed text-ink-faint">
                        O envio de arquivo será habilitado junto com o armazenamento de imagens.
                        Até lá o sistema usa a marca vetorial padrão com as cores escolhidas acima.
                      </p>
                      <Badge tone="muted" className="mt-3">Próxima etapa</Badge>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Nome completo" required error={errors.adminName} className="sm:col-span-2">
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.adminName}
                        onChange={(e) => set('adminName', e.target.value)} autoFocus />
                    )}
                  </Field>
                  <Field label="Usuário" required error={errors.adminUsername} hint="Usado para entrar no sistema.">
                    {({ id, invalid }) => (
                      <Input id={id} invalid={invalid} value={form.adminUsername} autoComplete="username"
                        onChange={(e) => set('adminUsername', e.target.value)} placeholder="marcus" />
                    )}
                  </Field>
                  <Field label="Telefone">
                    {({ id }) => (
                      <Input id={id} value={form.adminPhone} onChange={(e) => set('adminPhone', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Senha" required error={errors.password} hint="Mínimo de 8 caracteres, com letras e números.">
                    {({ id, invalid }) => (
                      <Input id={id} type="password" invalid={invalid} value={form.password} autoComplete="new-password"
                        onChange={(e) => set('password', e.target.value)} />
                    )}
                  </Field>
                  <Field label="Confirmar senha" required error={errors.confirmPassword}>
                    {({ id, invalid }) => (
                      <Input id={id} type="password" invalid={invalid} value={form.confirmPassword} autoComplete="new-password"
                        onChange={(e) => set('confirmPassword', e.target.value)} />
                    )}
                  </Field>
                  <Field label="E-mail" className="sm:col-span-2">
                    {({ id }) => (
                      <Input id={id} type="email" value={form.adminEmail}
                        onChange={(e) => set('adminEmail', e.target.value)} />
                    )}
                  </Field>
                  <p className="text-2xs leading-relaxed text-ink-faint sm:col-span-2">
                    Esta conta será criada como proprietária, vinculada a uma pessoa no cadastro
                    central, e receberá todas as autorizações. Outras contas podem ser criadas depois
                    com permissões específicas.
                  </p>
                </div>
              )}
            </div>
          </motion.section>
        </AnimatePresence>

        <footer className="mt-8 flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button
            variant="ghost"
            icon={<ArrowLeft />}
            onClick={() => setStep(Math.max(step - 1, 0))}
            disabled={step === 0 || submitting}
          >
            Voltar
          </Button>

          <Button
            variant={step === STEPS.length - 1 ? 'primary' : 'secondary'}
            size="lg"
            iconRight={step === STEPS.length - 1 ? <Check /> : <ArrowRight />}
            onClick={goNext}
            loading={submitting}
          >
            {step === STEPS.length - 1 ? 'Concluir configuração' : 'Continuar'}
          </Button>
        </footer>
      </div>
    </div>
  );
}
