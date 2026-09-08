import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Save } from 'lucide-react';
import { PageTransition } from '@/components/motion/PageTransition';
import { PageHeader } from '@/layouts/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { Wordmark } from '@/components/brand/Wordmark';
import { useToast } from '@/components/ui/Toast';
import { EASE } from '@/lib/motion';
import { clubProfile } from '@/data/club';

const TABS = [
  { value: 'clube', label: 'Clube' },
  { value: 'interface', label: 'Interface' },
  { value: 'geral', label: 'Geral' },
  { value: 'acesso', label: 'Acesso' },
];

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-graphite">
      <header className="border-b border-line px-6 py-5">
        <h3 className="font-heading text-[15px] font-medium tracking-editorial text-ink">{title}</h3>
        {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>}
      </header>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('clube');
  const [club, setClub] = useState(clubProfile);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    denseTables: false,
    showValues: true,
    weekStartsMonday: false,
  });

  const [general, setGeneral] = useState({
    season: String(new Date().getFullYear()),
    defaultDueDay: '10',
    defaultFee: '180',
    currency: 'BRL',
    lowStockAlerts: true,
    dueReminders: true,
  });

  const save = () => {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      toast.success('Configurações salvas', 'Nesta versão os ajustes não são persistidos.');
    }, 620);
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Gestão"
        title="Configurações"
        description="Informações institucionais, preferências de interface e parâmetros gerais da plataforma."
        actions={
          <Button variant="primary" icon={<Save />} loading={saving} onClick={save}>
            Salvar alterações
          </Button>
        }
      />

      <Tabs items={TABS} value={tab} onChange={setTab} className="mb-6" />

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
              <div className="mb-6 flex items-center gap-5 rounded-md border border-line bg-surface-sunken px-5 py-4">
                <Wordmark size="lg" />
                <p className="text-2xs leading-relaxed text-ink-faint">
                  A marca usa Sentient nos elementos institucionais.
                  <br />
                  O envio de brasão e assets visuais será liberado na próxima etapa.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nome do clube">
                  {({ id }) => (
                    <Input id={id} value={club.name} onChange={(e) => setClub({ ...club, name: e.target.value })} />
                  )}
                </Field>
                <Field label="Nome curto">
                  {({ id }) => (
                    <Input id={id} value={club.shortName} onChange={(e) => setClub({ ...club, shortName: e.target.value })} />
                  )}
                </Field>
                <Field label="Ano de fundação">
                  {({ id }) => (
                    <Input id={id} value={club.foundedAt} onChange={(e) => setClub({ ...club, foundedAt: e.target.value })} />
                  )}
                </Field>
                <Field label="Cidade">
                  {({ id }) => (
                    <Input id={id} value={club.city} onChange={(e) => setClub({ ...club, city: e.target.value })} />
                  )}
                </Field>
                <Field label="Praça esportiva">
                  {({ id }) => (
                    <Input id={id} value={club.stadium} onChange={(e) => setClub({ ...club, stadium: e.target.value })} />
                  )}
                </Field>
                <Field label="Cores">
                  {({ id }) => (
                    <Input id={id} value={club.colors} onChange={(e) => setClub({ ...club, colors: e.target.value })} />
                  )}
                </Field>
              </div>
            </Panel>

            <Panel title="Contato" description="Dados usados em comunicados e relatórios.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Presidente">
                  {({ id }) => (
                    <Input id={id} value={club.president} onChange={(e) => setClub({ ...club, president: e.target.value })} />
                  )}
                </Field>
                <Field label="Telefone">
                  {({ id }) => (
                    <Input id={id} value={club.phone} onChange={(e) => setClub({ ...club, phone: e.target.value })} />
                  )}
                </Field>
                <Field label="E-mail" className="sm:col-span-2">
                  {({ id }) => (
                    <Input id={id} type="email" value={club.email} onChange={(e) => setClub({ ...club, email: e.target.value })} />
                  )}
                </Field>
                <Field label="Observações internas" className="sm:col-span-2">
                  {({ id }) => <Textarea id={id} placeholder="Notas visíveis apenas para a administração" />}
                </Field>
              </div>
            </Panel>
          </>
        )}

        {tab === 'interface' && (
          <Panel title="Preferências de interface" description="Ajustes que valem para esta estação de trabalho.">
            <div className="divide-y divide-line">
              <Switch
                label="Reduzir animações"
                description="Mantém as transições no mínimo necessário para orientação."
                checked={preferences.reducedMotion}
                onChange={(value) => setPreferences({ ...preferences, reducedMotion: value })}
              />
              <Switch
                label="Tabelas compactas"
                description="Diminui o espaçamento das linhas para exibir mais registros por tela."
                checked={preferences.denseTables}
                onChange={(value) => setPreferences({ ...preferences, denseTables: value })}
              />
              <Switch
                label="Exibir valores financeiros"
                description="Oculte os valores ao apresentar a plataforma em tela compartilhada."
                checked={preferences.showValues}
                onChange={(value) => setPreferences({ ...preferences, showValues: value })}
              />
              <Switch
                label="Semana começa na segunda"
                description="Altera a ordem dos dias no calendário."
                checked={preferences.weekStartsMonday}
                onChange={(value) => setPreferences({ ...preferences, weekStartsMonday: value })}
              />
            </div>
          </Panel>
        )}

        {tab === 'geral' && (
          <>
            <Panel title="Parâmetros do clube" description="Valores sugeridos ao criar novos registros.">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Temporada vigente">
                  {({ id }) => (
                    <Input id={id} value={general.season} onChange={(e) => setGeneral({ ...general, season: e.target.value })} />
                  )}
                </Field>
                <Field label="Moeda">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={general.currency}
                      onChange={(e) => setGeneral({ ...general, currency: e.target.value })}
                      options={[{ value: 'BRL', label: 'Real (R$)' }]}
                    />
                  )}
                </Field>
                <Field label="Dia padrão de vencimento" hint="Aplicado a novos jogadores.">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      min={1}
                      max={31}
                      value={general.defaultDueDay}
                      onChange={(e) => setGeneral({ ...general, defaultDueDay: e.target.value })}
                    />
                  )}
                </Field>
                <Field label="Mensalidade padrão">
                  {({ id }) => (
                    <Input
                      id={id}
                      type="number"
                      min={0}
                      step="10"
                      value={general.defaultFee}
                      onChange={(e) => setGeneral({ ...general, defaultFee: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            </Panel>

            <Panel title="Alertas" description="Avisos exibidos no painel da administração.">
              <div className="divide-y divide-line">
                <Switch
                  label="Alertas de estoque baixo"
                  description="Destaca itens abaixo do mínimo no dashboard."
                  checked={general.lowStockAlerts}
                  onChange={(value) => setGeneral({ ...general, lowStockAlerts: value })}
                />
                <Switch
                  label="Lembretes de mensalidade"
                  description="Sinaliza cobranças vencidas e a vencer."
                  checked={general.dueReminders}
                  onChange={(value) => setGeneral({ ...general, dueReminders: value })}
                />
              </div>
            </Panel>
          </>
        )}

        {tab === 'acesso' && (
          <Panel
            title="Contas e permissões"
            description="Estrutura prevista para a próxima etapa do projeto."
          >
            <div className="mb-6 flex items-start gap-3 rounded-md border border-line-gold bg-gold-wash px-4 py-3.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              <p className="text-[13px] leading-relaxed text-ink-muted">
                Autenticação, contas de acesso e autorizações individuais ainda não estão
                habilitadas. Esta versão é uma demonstração visual do produto.
              </p>
            </div>

            <p className="eyebrow mb-4">Como o acesso será organizado</p>
            <ol className="flex flex-col gap-3">
              {[
                { step: 'Pessoa', detail: 'Cadastro central, único por indivíduo.' },
                { step: 'Vínculo', detail: 'Jogador, diretoria, comissão ou administrativo.' },
                { step: 'Conta de acesso', detail: 'Credencial opcional ligada a uma pessoa.' },
                { step: 'Autorizações', detail: 'Permissões por módulo, concedidas individualmente.' },
              ].map((row, index) => (
                <li key={row.step} className="flex items-start gap-4 rounded-md border border-line bg-surface-sunken px-4 py-3">
                  <span className="tabular mt-0.5 text-2xs text-ink-ghost">{String(index + 1).padStart(2, '0')}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink">{row.step}</span>
                    <span className="mt-0.5 block text-2xs text-ink-muted">{row.detail}</span>
                  </span>
                  <Badge tone="muted" className="ml-auto shrink-0">
                    Próxima etapa
                  </Badge>
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </motion.div>
    </PageTransition>
  );
}
