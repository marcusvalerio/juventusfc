/**
 * Migration 0003: dues move from the squad record to the person.
 *
 * This runs the real migration files against a scratch SQLite database, with a
 * club that looks like one already in production — players, a person holding
 * two links, and dues raised the old way. What it proves is the part that
 * cannot be undone: that no charge is lost, altered or duplicated on the way
 * across, and that a due raised for a player is still readable afterwards.
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let passed = 0;
const failures = [];
const check = (name, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const db = new DatabaseSync(join(mkdtempSync(join(tmpdir(), 'jfc-mig-')), 'scratch.sqlite'));
const run = (file) => db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
const all = (sql) => db.prepare(sql).all();
const one = (sql) => all(sql)[0];

console.log('\n== esquema anterior ==');
run('0001_initial.sql');
run('0002_password_reset.sql');
check('esquema anterior cobrava o jogador', /player_id/.test(one("SELECT sql FROM sqlite_master WHERE name='monthly_dues'").sql));

const now = '2026-09-01T00:00:00.000Z';
db.exec(`
INSERT INTO clubs (id, official_name, short_name, created_at, updated_at)
  VALUES ('clb_x','Juventus Futebol Clube','Juventus F.C.','${now}','${now}');
INSERT INTO people (id, club_id, full_name, nickname, status, created_at, updated_at) VALUES
  ('per_joao','clb_x','João Silva','João','ativo','${now}','${now}'),
  ('per_pedro','clb_x','Pedro Santos',NULL,'ativo','${now}','${now}'),
  ('per_maria','clb_x','Maria Oliveira',NULL,'ativo','${now}','${now}');
INSERT INTO players (id, club_id, person_id, position, monthly_fee, due_day, status, created_at, updated_at) VALUES
  ('ply_joao','clb_x','per_joao','Atacante',180,10,'ativo','${now}','${now}'),
  ('ply_pedro','clb_x','per_pedro','Zagueiro',250,15,'ativo','${now}','${now}');
-- Pedro is a player *and* a director: the case that must not double-charge.
INSERT INTO board_members (id, club_id, person_id, role, status, created_at, updated_at) VALUES
  ('brd_pedro','clb_x','per_pedro','Diretor','ativo','${now}','${now}');
-- Maria is staff only, and was never billed.
INSERT INTO staff_members (id, club_id, person_id, role, status, created_at, updated_at) VALUES
  ('stf_maria','clb_x','per_maria','Preparadora','ativo','${now}','${now}');
INSERT INTO monthly_dues (id, club_id, player_id, reference_month, due_date, expected_amount, paid_amount, paid_at, method, status, notes, created_at, updated_at) VALUES
  ('due_1','clb_x','ply_joao','2026-07','2026-07-10',180,180,'2026-07-08','Pix','pago','quitada','${now}','${now}'),
  ('due_2','clb_x','ply_joao','2026-08','2026-08-10',180,0,NULL,NULL,'atrasado',NULL,'${now}','${now}'),
  ('due_3','clb_x','ply_pedro','2026-08','2026-08-15',250,100,'2026-08-14','Dinheiro','parcial',NULL,'${now}','${now}');
`);

const before = {
  count: one('SELECT COUNT(*) c FROM monthly_dues').c,
  expected: one('SELECT SUM(expected_amount) s FROM monthly_dues').s,
  paid: one('SELECT SUM(paid_amount) s FROM monthly_dues').s,
  ids: all('SELECT id FROM monthly_dues ORDER BY id').map((r) => r.id).join(','),
};
console.log(`  (antes: ${before.count} mensalidades, previsto ${before.expected}, pago ${before.paid})`);

console.log('\n== migração ==');
run('0003_dues_by_person.sql');

const after = {
  count: one('SELECT COUNT(*) c FROM monthly_dues').c,
  expected: one('SELECT SUM(expected_amount) s FROM monthly_dues').s,
  paid: one('SELECT SUM(paid_amount) s FROM monthly_dues').s,
  ids: all('SELECT id FROM monthly_dues ORDER BY id').map((r) => r.id).join(','),
};

check('nenhuma mensalidade se perde', after.count === before.count, `${before.count} → ${after.count}`);
check('nenhuma mensalidade é criada', after.ids === before.ids, after.ids);
check('valores previstos intactos', after.expected === before.expected, `${before.expected} → ${after.expected}`);
check('valores pagos intactos', after.paid === before.paid, `${before.paid} → ${after.paid}`);
check(
  'nenhuma cobrança fica órfã',
  one('SELECT COUNT(*) c FROM monthly_dues d LEFT JOIN people p ON p.id = d.person_id WHERE p.id IS NULL').c === 0,
);

const due1 = one("SELECT * FROM monthly_dues WHERE id = 'due_1'");
check('a cobrança aponta para a pessoa do jogador', due1.person_id === 'per_joao', due1.person_id);
check('status preservado', due1.status === 'pago', due1.status);
check('pagamento preservado', due1.paid_at === '2026-07-08' && due1.method === 'Pix');
check('observação preservada', due1.notes === 'quitada', String(due1.notes));
check('datas de criação preservadas', due1.created_at === now && due1.updated_at === now);

check(
  'mensalidade antiga continua legível pelo jogador',
  one(`SELECT COUNT(*) c FROM monthly_dues d
         JOIN players pl ON pl.person_id = d.person_id
        WHERE pl.id = 'ply_joao'`).c === 2,
);

console.log('\n== cobrança por pessoa ==');
check('a coluna player_id deixa de existir', !/player_id/.test(one("SELECT sql FROM sqlite_master WHERE name='monthly_dues'").sql));
check(
  'a unicidade passa a ser por pessoa e mês',
  /UNIQUE \(person_id, reference_month\)/.test(one("SELECT sql FROM sqlite_master WHERE name='monthly_dues'").sql),
);

let duplicated = false;
try {
  db.exec(`INSERT INTO monthly_dues (id, club_id, person_id, reference_month, due_date, expected_amount, paid_amount, status, created_at, updated_at)
           VALUES ('due_dup','clb_x','per_pedro','2026-08','2026-08-15',250,0,'pendente','${now}','${now}')`);
  duplicated = true;
} catch {
  // The constraint is what should stop this.
}
check('o banco recusa duas cobranças da mesma pessoa no mesmo mês', duplicated === false);

console.log('\n== configuração de cobrança nas pessoas ==');
const joao = one("SELECT * FROM people WHERE id = 'per_joao'");
const pedro = one("SELECT * FROM people WHERE id = 'per_pedro'");
const maria = one("SELECT * FROM people WHERE id = 'per_maria'");
check('quem era jogador continua mensalista', joao.monthly_fee_enabled === 1 && pedro.monthly_fee_enabled === 1);
check('o valor do jogador migra para a pessoa', joao.monthly_fee === 180 && pedro.monthly_fee === 250);
check('o dia de vencimento migra para a pessoa', joao.due_day === 10 && pedro.due_day === 15);
check('quem não era jogador não vira mensalista', maria.monthly_fee_enabled === 0, String(maria.monthly_fee_enabled));

// Pedro holds two links and must still appear once.
check(
  'pessoa com dois vínculos tem uma única cobrança no mês',
  one(`SELECT COUNT(*) c FROM monthly_dues WHERE person_id = 'per_pedro' AND reference_month = '2026-08'`).c === 1,
);

db.close();
console.log(`\n${passed} verificações passaram, ${failures.length} falharam.`);
if (failures.length) {
  console.log(failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
