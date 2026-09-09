import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { PublicScreen } from '@/layouts/PublicScreen';
import { Button, LinkButton } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useSession } from '@/app/SessionContext';
import { ApiError } from '@/services/api';
import { passwordResetService } from '@/services/passwordReset';

type Stage = 'checking' | 'ready' | 'expired' | 'done';

/**
 * Step two: the link itself.
 *
 * The token is checked before the form appears, so nobody types a password
 * twice into a link that already expired. The password policy is the server's —
 * this screen only relays what it answers.
 */
export default function ResetPasswordPage() {
  const { needsOnboarding, publicClub, refreshBootstrap } = useSession();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [stage, setStage] = useState<Stage>(token ? 'checking' : 'expired');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void passwordResetService
      .check(token)
      .then((payload) => {
        if (active) setStage(payload.valid ? 'ready' : 'expired');
      })
      .catch(() => {
        if (active) setStage('expired');
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (needsOnboarding) return <Navigate to="/entrar" replace />;

  const backdrop = (publicClub?.shortName ?? 'Clube').split(' ')[0].toUpperCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await passwordResetService.confirm(token, password, confirmPassword);
      setPassword('');
      setConfirmPassword('');
      setStage('done');
      // The reset revoked every session of that account, this tab included.
      await refreshBootstrap();
    } catch (cause) {
      if (cause instanceof ApiError && cause.details) {
        setErrors({
          password: cause.details.password,
          confirmPassword: cause.details.confirmPassword,
          form: cause.details.password || cause.details.confirmPassword ? undefined : cause.message,
        });
      } else if (cause instanceof ApiError) {
        // A dead link is not a form error — send the visitor back to the start.
        setStage('expired');
      } else {
        setErrors({ form: 'Não foi possível redefinir agora. Tente novamente.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const backToLogin = (
    <Link
      to="/entrar"
      className="inline-flex items-center gap-1.5 text-2xs text-ink-faint transition-colors hover:text-gold"
    >
      <ArrowLeft className="h-3 w-3" aria-hidden />
      Voltar para o login
    </Link>
  );

  if (stage === 'checking') {
    return (
      <PublicScreen eyebrow="Recuperação de acesso" title="Verificando o link" backdrop={backdrop} mascot="login">
        <div className="rounded-lg border border-line bg-graphite p-6">
          <div className="h-2 w-24 rounded-full bg-surface-hover skeleton-sheen" />
          <div className="mt-3 h-2 w-40 rounded-full bg-surface-hover skeleton-sheen" />
          <p className="sr-only" role="status">
            Verificando o link de redefinição.
          </p>
        </div>
      </PublicScreen>
    );
  }

  if (stage === 'expired') {
    return (
      <PublicScreen
        eyebrow="Recuperação de acesso"
        title="Link indisponível"
        backdrop={backdrop}
        mascot="login"
        footer={backToLogin}
      >
        <div className="rounded-lg border border-line bg-graphite p-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(224,82,82,0.3)] bg-danger-wash">
            <ShieldAlert className="h-4 w-4 text-danger" aria-hidden />
          </span>
          <p className="mt-5 text-[13px] leading-relaxed text-ink-muted" role="status">
            Este link de redefinição é inválido, já foi usado ou expirou. Peça um novo para
            continuar — o anterior deixa de valer assim que outro é solicitado.
          </p>
          <LinkButton
            to="/esqueci-senha"
            variant="primary"
            size="lg"
            iconRight={<ArrowRight />}
            className="mt-6 w-full"
          >
            Pedir um novo link
          </LinkButton>
        </div>
      </PublicScreen>
    );
  }

  if (stage === 'done') {
    return (
      <PublicScreen
        eyebrow="Recuperação de acesso"
        title="Senha alterada"
        backdrop={backdrop}
        mascot="login"
      >
        <div className="rounded-lg border border-line bg-graphite p-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(53,183,121,0.3)] bg-success-wash">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
          </span>
          <p className="mt-5 text-[13px] leading-relaxed text-ink-muted" role="status">
            Senha alterada com sucesso. Por segurança, encerramos as sessões abertas desta
            conta — entre novamente com a nova senha.
          </p>
          <LinkButton
            to="/entrar"
            variant="primary"
            size="lg"
            iconRight={<ArrowRight />}
            className="mt-6 w-full"
          >
            Voltar para o login
          </LinkButton>
        </div>
      </PublicScreen>
    );
  }

  return (
    <PublicScreen
      eyebrow="Recuperação de acesso"
      title="Nova senha"
      backdrop={backdrop}
      mascot="login"
      footer={backToLogin}
    >
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-line bg-graphite p-6">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Escolha uma senha com ao menos 8 caracteres, contendo letras e números.
        </p>

        <Field label="Nova senha" error={errors.password}>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="password"
              invalid={invalid}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              autoFocus
              prefixIcon={<KeyRound />}
              placeholder="••••••••"
              disabled={submitting}
            />
          )}
        </Field>

        <Field label="Confirmar nova senha" error={errors.confirmPassword}>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="password"
              invalid={invalid}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              prefixIcon={<Lock />}
              placeholder="••••••••"
              disabled={submitting}
            />
          )}
        </Field>

        {errors.form && (
          <p className="text-2xs text-danger" role="alert">
            {errors.form}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          iconRight={<ArrowRight />}
          className="mt-1 w-full"
        >
          Redefinir senha
        </Button>
      </form>

      <p className="mt-6 text-center text-2xs leading-relaxed text-ink-ghost">
        Ao concluir, todas as sessões abertas desta conta serão encerradas.
      </p>
    </PublicScreen>
  );
}
