-- Password recovery.
--
-- Additive only: no existing table, column or row is touched. The reset token
-- follows the same rule as the session cookie — only its SHA-256 is stored, so
-- reading this table never yields a usable link.

CREATE TABLE password_resets (
  id             TEXT PRIMARY KEY,
  account_id     TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash     TEXT NOT NULL,          -- SHA-256 of the token; the token itself is never stored
  created_at     TEXT NOT NULL,
  expires_at     TEXT NOT NULL,
  used_at        TEXT,                   -- set once; a used token never works again
  invalidated_at TEXT,                   -- set when a newer request supersedes this one
  user_agent     TEXT                    -- never the address, never the token
);

CREATE UNIQUE INDEX idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX idx_password_resets_account ON password_resets(account_id, created_at);
CREATE INDEX idx_password_resets_expires ON password_resets(expires_at);

-- Delivery record for transactional mail.
--
-- `body` is written only by the development capture sink, which refuses to run
-- in production. With no provider configured a row is still written with
-- status 'sem_provedor', so an operator can see that a reset was requested and
-- not delivered instead of the request vanishing.
CREATE TABLE mail_outbox (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  recipient  TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT,
  provider   TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('enviado', 'capturado', 'sem_provedor', 'falhou')),
  error      TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_mail_outbox_created ON mail_outbox(created_at);
CREATE INDEX idx_mail_outbox_status ON mail_outbox(status, created_at);
