/**
 * Permission catalogue — shared by the Worker (enforcement) and the SPA (UI gating).
 *
 * Capabilities are granular strings, never rigid profiles: an account gets
 * exactly the actions it needs. The backend is the authority; hiding a button
 * in the UI is a convenience, not a control.
 */

export const PERMISSION_GROUPS = [
  {
    module: 'dashboard',
    label: 'Dashboard',
    actions: [{ key: 'view', label: 'Visualizar' }],
  },
  {
    module: 'people',
    label: 'Pessoas',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Cadastrar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir' },
    ],
  },
  {
    module: 'squad',
    label: 'Jogadores, diretoria e comissão',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Cadastrar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir' },
    ],
  },
  {
    module: 'football',
    label: 'Jogos, campeonatos, treinos e escalações',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Cadastrar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir' },
    ],
  },
  {
    module: 'finance',
    label: 'Financeiro',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Lançar' },
      { key: 'edit', label: 'Editar' },
      { key: 'delete', label: 'Excluir' },
    ],
  },
  {
    module: 'inventory',
    label: 'Estoque',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'create', label: 'Cadastrar' },
      { key: 'move', label: 'Movimentar' },
      { key: 'delete', label: 'Excluir' },
    ],
  },
  {
    module: 'reports',
    label: 'Relatórios',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'export', label: 'Exportar' },
    ],
  },
  {
    module: 'settings',
    label: 'Configurações',
    actions: [
      { key: 'view', label: 'Acessar' },
      { key: 'edit', label: 'Editar' },
    ],
  },
  {
    module: 'accounts',
    label: 'Contas e autorizações',
    actions: [
      { key: 'view', label: 'Visualizar' },
      { key: 'manage', label: 'Gerenciar' },
    ],
  },
] as const;

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((group) =>
  group.actions.map((action) => `${group.module}.${action.key}`),
);

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

export const isValidPermission = (value: string) => PERMISSION_SET.has(value);

/** Label for a permission string, used in the accounts screen. */
export function describePermission(permission: string): string {
  const [module, action] = permission.split('.');
  const group = PERMISSION_GROUPS.find((item) => item.module === module);
  const entry = group?.actions.find((item) => item.key === action);
  return group && entry ? `${group.label} · ${entry.label}` : permission;
}
