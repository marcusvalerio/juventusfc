import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Sparkles, User } from 'lucide-react';
import { PublicScreen } from '@/layouts/PublicScreen';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useSession } from '@/app/SessionContext';
import { ApiError } from '@/services/api';

/**
 * Sign-in by username and password. The session lives in an HttpOnly cookie set
 * by the API, so nothing sensitive is kept in the page.
 *
 * Rendered inside BootstrapGate, so `needsOnboarding` and `account` are already
 * known here — no branch runs against a value that is merely still unset.
 */
export default function LoginPage() {
  const { account, needsOnboarding, login, publicClub } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (account) {
    const target = (location.state as { from?: string } | null)?.from ?? '/app';
    return <Navigate to={target} replace />;
  }

  const backdrop = (publicClub?.shortName ?? 'Clube').split(' ')[0].toUpperCase();

  /**
   * No club yet means no account exists that a password could match. Instead of
   * a login form nobody can use, this offers the only real next step. The
   * backend is still the authority: it refuses onboarding once a club exists.
   */
  if (needsOnboarding) {
    return (
      <PublicScreen eyebrow="Primeiro acesso" title="Configure o clube" backdrop="CLUBE">
        <div className="rounded-lg border border-line bg-graphite p-6">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Esta instalação ainda não foi configurada, então ainda não existe nenhuma conta
            para entrar. Configure o clube e crie a conta do administrador para começar.
          </p>
          <Button
            variant="primary"
            size="lg"
            iconRight={<ArrowRight />}
            className="mt-6 w-full"
            onClick={() => navigate('/onboarding')}
          >
            Configurar clube
          </Button>
        </div>
        <p className="mt-6 text-center text-2xs leading-relaxed text-ink-ghost">
          Você define o próprio usuário e senha durante a configuração.
          <br />
          Não existem credenciais padrão.
        </p>
      </PublicScreen>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Informe usuário e senha.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await login(username.trim(), password);
      navigate((location.state as { from?: string } | null)?.from ?? '/app', { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Não foi possível entrar. Tente novamente.',
      );
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicScreen
      eyebrow="Acesso à plataforma"
      title={publicClub?.shortName ?? 'Entrar'}
      backdrop={backdrop}
      mascot="login"
      footer={
        <Link to="/" className="text-2xs text-ink-faint transition-colors hover:text-gold">
          Voltar ao portal
        </Link>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-line bg-graphite p-6">
        <Field label="Usuário">
          {({ id }) => (
            <Input
              id={id}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              autoFocus
              prefixIcon={<User />}
              placeholder="seu.usuario"
              disabled={submitting}
            />
          )}
        </Field>

        <Field label="Senha" error={error}>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="password"
              invalid={invalid}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              prefixIcon={<Lock />}
              placeholder="••••••••"
              disabled={submitting}
            />
          )}
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          iconRight={<ArrowRight />}
          className="mt-2 w-full"
        >
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-center text-2xs text-ink-ghost">
        <Link to="/esqueci-senha" className="text-ink-faint transition-colors hover:text-gold">
          Esqueceu a senha?
        </Link>
      </p>

      {/* Discreet pointer for someone who arrived expecting to set the club up.
          It never offers a sign-up: the instance is already configured. */}
      <div className="mt-6 flex items-start gap-2.5 rounded-md border border-line bg-surface-sunken px-4 py-3">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-ghost" aria-hidden />
        <p className="text-2xs leading-relaxed text-ink-faint">
          <span className="text-ink-muted">Primeiro acesso?</span> Este clube já está
          configurado — peça à administração que crie a sua conta em Configurações › Acesso.
        </p>
      </div>
    </PublicScreen>
  );
}
