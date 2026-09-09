export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ENVIRONMENT: 'development' | 'production';
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
