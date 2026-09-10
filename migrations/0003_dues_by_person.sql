-- Monthly dues belong to the person, not to the squad record.
--
-- A person may hold several links to the club at once — player, board, staff —
-- and must still be charged once. Hanging the charge off `players` made the
-- squad record the billing identity, which both excluded everyone who is not a
-- player and would have duplicated the charge for anyone who is more than one
-- thing.
--
-- Nothing is discarded here. Every existing due is carried over through
-- players.person_id, and the rebuild below fails loudly rather than silently
-- dropping a row: person_id is NOT NULL, so a due whose player cannot be
-- resolved aborts the migration instead of disappearing.

-- ---------------------------------------------------------------- people

-- Whether this person is charged at all. Default 0: being registered at the
-- club is not the same as being a paying member.
ALTER TABLE people ADD COLUMN monthly_fee_enabled INTEGER NOT NULL DEFAULT 0;

-- Defaults for *new* charges only. Existing dues keep the amount and due date
-- they were raised with; changing these never rewrites history.
ALTER TABLE people ADD COLUMN monthly_fee REAL NOT NULL DEFAULT 0;
ALTER TABLE people ADD COLUMN due_day INTEGER NOT NULL DEFAULT 10;

-- Everyone who is a player today was already being billed, and their amount
-- lived on the squad row. Move it to the person, which is where billing now
-- reads from.
UPDATE people
   SET monthly_fee_enabled = 1,
       monthly_fee = COALESCE((SELECT pl.monthly_fee FROM players pl WHERE pl.person_id = people.id), monthly_fee),
       due_day     = COALESCE((SELECT pl.due_day     FROM players pl WHERE pl.person_id = people.id), due_day)
 WHERE EXISTS (SELECT 1 FROM players pl WHERE pl.person_id = people.id);

-- ---------------------------------------------------------- monthly_dues

-- SQLite cannot repoint a foreign key or move a UNIQUE constraint in place, so
-- the table is rebuilt. The data is copied first and the old table is dropped
-- only after — no due is created, altered or lost by this.
CREATE TABLE monthly_dues_rebuilt (
  id              TEXT PRIMARY KEY,
  club_id         TEXT NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  person_id       TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,          -- YYYY-MM
  due_date        TEXT NOT NULL,
  expected_amount REAL NOT NULL DEFAULT 0,
  paid_amount     REAL NOT NULL DEFAULT 0,
  paid_at         TEXT,
  method          TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pago','pendente','parcial','atrasado')),
  notes           TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  -- One charge per person per month, whatever links that person holds.
  UNIQUE (person_id, reference_month)
);

INSERT INTO monthly_dues_rebuilt
  (id, club_id, person_id, reference_month, due_date, expected_amount, paid_amount,
   paid_at, method, status, notes, created_at, updated_at)
SELECT d.id, d.club_id, pl.person_id, d.reference_month, d.due_date, d.expected_amount,
       d.paid_amount, d.paid_at, d.method, d.status, d.notes, d.created_at, d.updated_at
  FROM monthly_dues d
  LEFT JOIN players pl ON pl.id = d.player_id;

DROP TABLE monthly_dues;
ALTER TABLE monthly_dues_rebuilt RENAME TO monthly_dues;

CREATE INDEX idx_dues_club_month ON monthly_dues(club_id, reference_month);
CREATE INDEX idx_dues_status ON monthly_dues(club_id, status);
CREATE INDEX idx_dues_person ON monthly_dues(person_id, reference_month);
