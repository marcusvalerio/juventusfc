export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: 'development' | 'production';
  /**
   * Absolute origin the SPA is served from, used to build the reset link.
   * Behind the Vercel proxy the Worker only sees its own host, so in production
   * this has to be set explicitly; empty falls back to the request origin.
   */
  APP_ORIGIN?: string;
  /**
   * Selects the mail provider. Unset means no provider: resets are created and
   * recorded but nothing is delivered. `capture` is the development sink and is
   * refused outside development.
   */
  MAIL_PROVIDER?: string;
  /** Optional R2 bucket for crests and documents (enabled in a later phase). */
  FILES?: R2Bucket;
}

export interface SessionContext {
  accountId: string;
  personId: string;
  clubId: string;
  username: string;
  displayName: string;
  isOwner: boolean;
  permissions: Set<string>;
  sessionId: string;
}

export type AppBindings = {
  Bindings: Env;
  Variables: {
    session: SessionContext;
    clubId: string;
  };
};
