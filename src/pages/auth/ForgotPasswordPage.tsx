import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react';
import { PublicScreen } from '@/layouts/PublicScreen';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import { useSession } from '@/app/SessionContext';
import { ApiError } from '@/services/api';
import { passwordResetService } from '@/services/passwordReset';

/**
 * Step one of recovery: ask for the address, then show the answer the API gave.
 *
 * That answer is deliberately the same whether or not an account exists, and
 * this screen never tries to be more helpful than that — a "we couldn't find
 * that e-mail" would hand out the club's member list one guess at a time.
 */
export default function ForgotPasswordPage() {
  const { needsOnboarding, publicClub } = useSession();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [answer, setAnswer] = useState<string>();

  // No club means no account a password could belong to; the login screen
  // already explains that state properly.
  if (needsOnboarding) return <Navigate to="/entrar" replace />;

  const backdrop = (publicClub?.shortName ?? 'Clube').split(' ')[0].toUpperCase();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      setError('Informe o e-mail da conta.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const payload = await passwordResetService.request(email.trim());
      setAnswer(payload.message);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? (cause.details?.email ?? cause.message)
          : 'Não foi possível enviar agora. Tente novamente.',
      );
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

  if (answer) {
    return (
      <PublicScreen
        eyebrow="Recuperação de acesso"
        title="Verifique o e-mail"
        backdrop={backdrop}
        mascot="login"
        footer={backToLogin}
      >
        <div className="rounded-lg border border-line bg-graphite p-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line-gold bg-gold-wash">
            <MailCheck className="h-4 w-4 text-gold-light" aria-hidden />
          </span>
          <p className="mt-5 text-[13px] leading-relaxed text-ink-muted" role="status">
            {answer}
          </p>
          <p className="mt-4 text-2xs leading-relaxed text-ink-ghost">
            O link vale por 30 minutos e só pode ser usado uma vez. Se não chegar, confira a
            caixa de spam ou peça à administração do clube que confirme o e-mail cadastrado.
          </p>
        </div>
      </PublicScreen>
    );
  }

  return (
    <PublicScreen
      eyebrow="Recuperação de acesso"
      title="Esqueceu a senha?"
      backdrop={backdrop}
      mascot="login"
      footer={backToLogin}
    >
      <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg border border-line bg-graphite p-6">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          Informe o e-mail cadastrado na sua ficha. Enviaremos as instruções para escolher
          uma nova senha.
        </p>

        <Field label="E-mail da conta" error={error}>
          {({ id, invalid }) => (
            <Input
              id={id}
              type="email"
              invalid={invalid}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoFocus
              prefixIcon={<Mail />}
              placeholder="voce@exemplo.com"
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
          className="mt-1 w-full"
        >
          Enviar instruções
        </Button>
      </form>

      <p className="mt-6 text-center text-2xs leading-relaxed text-ink-ghost">
        Por segurança, a resposta é a mesma para qualquer endereço informado.
      </p>
    </PublicScreen>
  );
}
