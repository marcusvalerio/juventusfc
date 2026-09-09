import { Hono } from 'hono';
import type { AppBindings } from '../lib/env';
import { badRequest, notFound } from '../lib/errors';
import { newId, nowIso } from '../lib/id';
import { mapInventoryItem, mapMovement } from '../lib/mappers';
import { requirePermission } from '../lib/middleware';
import { logActivity } from '../lib/activity';
import { isoDate, optionalText, parseBody, requiredText, z } from '../lib/validate';

const inventory = new Hono<AppBindings>();

const MOVEMENT_SELECT = `
  SELECT m.*, i.name AS item_name
    FROM inventory_movements m
    JOIN inventory_items i ON i.id = m.item_id
`;

const itemSchema = z.object({
  name: requiredText('O nome do item'),
  category: requiredText('A categoria', 80),
  quantity: z.coerce.number().min(0).default(0),
  unit: requiredText('A unidade', 20),
  minQuantity: z.coerce.number().min(0).default(0),
  location: optionalText(200),
  notes: optionalText(2000),
});

inventory.get('/items', requirePermission('inventory.view'), async (c) => {
  const rows = await c.env.DB.prepare('SELECT * FROM inventory_items WHERE club_id = ? ORDER BY name')
    .bind(c.get('clubId'))
    .all();
  return c.json({ data: rows.results.map(mapInventoryItem) });
});

inventory.post('/items', requirePermission('inventory.create'), async (c) => {
  const body = await parseBody(c.req.raw, itemSchema);
  const now = nowIso();
  const id = newId('inv');
  await c.env.DB.prepare(
    `INSERT INTO inventory_items (id, club_id, name, category, quantity, unit, min_quantity, location, notes, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(id, c.get('clubId'), body.name, body.category, body.quantity, body.unit,
      body.minQuantity, body.location, body.notes, now, now)
    .run();

  await logActivity(c.env, c.get('session'), {
    kind: 'estoque', title: 'Item cadastrado', detail: body.name,
  });
  const row = await c.env.DB.prepare('SELECT * FROM inventory_items WHERE id = ?').bind(id).first();
  return c.json({ data: mapInventoryItem(row!) }, 201);
});

inventory.put('/items/:id', requirePermission('inventory.create'), async (c) => {
  const body = await parseBody(c.req.raw, itemSchema);
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT id FROM inventory_items WHERE id=? AND club_id=?')
    .bind(id, c.get('clubId')).first();
  if (!existing) throw notFound('Item não encontrado.');

  await c.env.DB.prepare(
    `UPDATE inventory_items SET name=?, category=?, quantity=?, unit=?, min_quantity=?,
                                location=?, notes=?, updated_at=? WHERE id=? AND club_id=?`,
  )
    .bind(body.name, body.category, body.quantity, body.unit, body.minQuantity,
      body.location, body.notes, nowIso(), id, c.get('clubId'))
    .run();

  const row = await c.env.DB.prepare('SELECT * FROM inventory_items WHERE id = ?').bind(id).first();
  return c.json({ data: mapInventoryItem(row!) });
});

inventory.delete('/items/:id', requirePermission('inventory.delete'), async (c) => {
  await c.env.DB.prepare('DELETE FROM inventory_items WHERE id=? AND club_id=?')
    .bind(c.req.param('id'), c.get('clubId')).run();
  return c.json({ ok: true });
});

inventory.get('/movements', requirePermission('inventory.view'), async (c) => {
  const rows = await c.env.DB.prepare(
    `${MOVEMENT_SELECT} WHERE m.club_id = ? ORDER BY m.movement_date DESC, m.created_at DESC`,
  ).bind(c.get('clubId')).all();
  return c.json({ data: rows.results.map(mapMovement) });
});

const movementSchema = z.object({
  itemId: requiredText('O item', 60),
  type: z.enum(['entrada', 'saida', 'ajuste']),
  quantity: z.coerce.number(),
  date: isoDate,
  responsible: optionalText(160),
  reason: requiredText('O motivo', 200),
  notes: optionalText(2000),
});

/**
 * Movement and balance are written together: `inventory_items.quantity` is the
 * running balance and is only ever changed by a movement in the same batch, so
 * the two can never disagree.
 */
inventory.post('/movements', requirePermission('inventory.move'), async (c) => {
  const body = await parseBody(c.req.raw, movementSchema);
  const clubId = c.get('clubId');

  const item = await c.env.DB.prepare('SELECT * FROM inventory_items WHERE id=? AND club_id=?')
    .bind(body.itemId, clubId)
    .first<{ id: string; name: string; quantity: number }>();
  if (!item) throw notFound('Item não encontrado.');

  if (body.type !== 'ajuste' && body.quantity <= 0) {
    throw badRequest('Dados inválidos.', { quantity: 'Informe uma quantidade maior que zero.' });
  }

  const delta =
    body.type === 'entrada' ? body.quantity : body.type === 'saida' ? -body.quantity : body.quantity;
  const nextQuantity = Number(item.quantity) + delta;

  if (nextQuantity < 0) {
    throw badRequest('Dados inválidos.', {
      quantity: `Saldo insuficiente: o item tem ${item.quantity} em estoque.`,
    });
  }

  const now = nowIso();
  const id = newId('mov');
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO inventory_movements (id, club_id, item_id, type, quantity, movement_date,
                                        responsible, reason, notes, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).bind(id, clubId, body.itemId, body.type, Math.abs(body.quantity), body.date,
      body.responsible, body.reason, body.notes, now, now),
    c.env.DB.prepare('UPDATE inventory_items SET quantity=?, updated_at=? WHERE id=? AND club_id=?')
      .bind(nextQuantity, now, body.itemId, clubId),
  ]);

  await logActivity(c.env, c.get('session'), {
    kind: 'estoque',
    title: body.type === 'entrada' ? 'Entrada de material' : body.type === 'saida' ? 'Saída de material' : 'Ajuste de estoque',
    detail: `${item.name} — ${body.reason}`,
  });

  const row = await c.env.DB.prepare(`${MOVEMENT_SELECT} WHERE m.id = ?`).bind(id).first();
  return c.json({ data: mapMovement(row!) }, 201);
});

export default inventory;
