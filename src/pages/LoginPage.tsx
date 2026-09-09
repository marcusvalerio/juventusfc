import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Lock, User } from 'lucide-react';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useSession } from '@/app/SessionContext';
import { ApiError } from '@/services/api';

/**
 * Sign-in by username and password. The session lives in an HttpOnly cookie
 * set by the API, so nothing sensitive is kept in the page.
 */
export default function LoginPage() {
  const { account, needsOnboarding, login, publicClub } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (account) {
    const target = (location.state as { from?: string } | null)?.from ?? '/app';
    return <Navigate to={target} replace />;
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
    <div className="grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-onyx px-6">
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <span className="whitespace-nowrap font-display text-[26vw] font-medium leading-none tracking-tightest text-ink opacity-[0.03]">
          {(publicClub?.shortName ?? 'CLUBE').split(' ')[0].toUpperCase()}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.editorial, ease: EASE }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Crest className="mb-6 h-10" />
          <p className="eyebrow">Acesso à plataforma</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tightest text-ink">
            {publicClub?.shortName ?? 'Entrar'}
          </h1>
        </div>

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
          Esqueceu a senha? Fale com a administração do clube.
        </p>
        <p className="mt-2 text-center text-2xs">
          <Link to="/" className="text-ink-faint transition-colors hover:text-gold">
            Voltar ao portal
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
