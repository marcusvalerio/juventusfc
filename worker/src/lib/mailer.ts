import type { Env } from './env';
import { newId, nowIso } from './id';

/**
 * Transactional mail.
 *
 * The platform has no mail provider configured, and inventing one would mean
 * inventing credentials. So this is a seam, not a fake: a single interface, a
 * default that records the attempt and reports honestly that nothing went out,
 * and a development sink used to work on the flow locally. Adding a real
 * provider means adding one implementation here and one variable — nothing
 * upstream of `Mailer` changes.
 */

export type DeliveryStatus = 'enviado' | 'capturado' | 'sem_provedor' | 'falhou';

export interface MailMessage {
  kind: 'password_reset';
  recipient: string;
  subject: string;
  /** Carries the reset link, so it is only ever persisted by the dev sink. */
  body: string;
}

export interface Delivery {
  status: DeliveryStatus;
  provider: string;
  error?: string;
}

export interface Mailer {
  readonly name: string;
  deliver(message: MailMessage): Promise<Delivery>;
}

/**
 * What the platform runs with today. It never claims to have sent anything: the
 * row it writes is the operator's record that a reset was asked for and could
 * not be delivered.
 */
const unconfiguredMailer: Mailer = {
  name: 'nao-configurado',
  async deliver() {
    return {
      status: 'sem_provedor',
      provider: 'nao-configurado',
      error: 'Nenhum provedor de e-mail está configurado nesta instalação.',
    };
  },
};

/**
 * Development sink, in the shape of Mailpit or letter_opener: the message is
 * stored so the flow can be exercised locally end to end. It writes the reset
 * link in clear text, which is why it refuses to run outside development and is
 * never reachable over HTTP — reading it means querying the local database.
 */
const captureMailer: Mailer = {
  name: 'captura-dev',
  async deliver() {
    return { status: 'capturado', provider: 'captura-dev' };
  },
};

export function resolveMailer(env: Env): Mailer {
  if (env.MAIL_PROVIDER === 'capture' && env.ENVIRONMENT !== 'production') return captureMailer;
  return unconfiguredMailer;
}

/**
 * Delivers and records the outcome. The body is persisted only by the
 * development sink; every other provider stores the envelope and the result.
 *
 * Recording must never take the request down with it — a reset that was created
 * is still valid even if the audit row fails to write.
 */
export async function sendMail(env: Env, message: MailMessage): Promise<Delivery> {
  const mailer = resolveMailer(env);
  let delivery: Delivery;
  try {
    delivery = await mailer.deliver(message);
  } catch (error) {
    delivery = {
      status: 'falhou',
      provider: mailer.name,
      error: error instanceof Error ? error.message : 'Falha desconhecida no envio.',
    };
  }

  try {
    await env.DB.prepare(
      `INSERT INTO mail_outbox (id, kind, recipient, subject, body, provider, status, error, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId('mail'),
        message.kind,
        message.recipient,
        message.subject,
        delivery.status === 'capturado' ? message.body : null,
        delivery.provider,
        delivery.status,
        delivery.error ?? null,
        nowIso(),
      )
      .run();
  } catch (error) {
    // Deliberately without the message: it carries the reset link.
    console.error(
      'mail_outbox_write_failed',
      error instanceof Error ? error.message : String(error),
    );
  }

  return delivery;
}

/** Plain-text body. No provider means no template engine to justify yet. */
export function passwordResetMessage(input: {
  recipient: string;
  displayName: string;
  clubName: string;
  resetUrl: string;
  expiresInMinutes: number;
}): MailMessage {
  // The club's short name often already ends in a period ("Juventus F.C.").
  const club = input.clubName.endsWith('.') ? input.clubName.slice(0, -1) : input.clubName;
  const body = [
    `Olá, ${input.displayName}.`,
    '',
    `Recebemos um pedido para redefinir a senha da sua conta no ${club}.`,
    'Abra o endereço abaixo para escolher uma nova senha:',
    '',
    input.resetUrl,
    '',
    `O link vale por ${input.expiresInMinutes} minutos e só pode ser usado uma vez.`,
    'Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.',
    '',
    input.clubName,
  ].join('\n');

  return {
    kind: 'password_reset',
    recipient: input.recipient,
    subject: `${input.clubName} — redefinição de senha`,
    body,
  };
}
