import type { Env, SessionContext } from './env';
import { newId, nowIso } from './id';

type Kind = 'financeiro' | 'elenco' | 'futebol' | 'estoque' | 'sistema';

/**
 * Records an operational event. The dashboard feed reads real rows from here,
 * and the table doubles as the foundation for a fuller audit trail later.
 * Logging must never break the request that triggered it.
 */
export async function logActivity(
  env: Env,
  session: Pick<SessionContext, 'clubId' | 'accountId' | 'displayName'>,
  entry: { kind: Kind; title: string; detail?: string; entityType?: string; entityId?: string },
) {
  try {
    await env.DB.prepare(
      `INSERT INTO activity_log
         (id, club_id, account_id, actor_name, kind, title, detail, entity_type, entity_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        newId('act'),
        session.clubId,
        session.accountId,
        session.displayName,
        entry.kind,
        entry.title,
        entry.detail ?? null,
        entry.entityType ?? null,
        entry.entityId ?? null,
        nowIso(),
      )
      .run();
  } catch (error) {
    console.error('activity_log_failed', error instanceof Error ? error.message : String(error));
  }
}
