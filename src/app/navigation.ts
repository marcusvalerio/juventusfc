import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  FileBarChart,
  LayoutDashboard,
  Receipt,
  Settings,
  Shield,
  Swords,
  Trophy,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Section title shown in the page header and breadcrumb. */
  area: string;
  /** Capability required to see and open the section. */
  permission: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, breadcrumbs and command palette. */
export const navigation: NavSection[] = [
  {
    title: 'Início',
    items: [{ label: 'Dashboard', to: '/app', icon: LayoutDashboard, area: 'Início', permission: 'dashboard.view' }],
  },
  {
    title: 'Clube',
    items: [
      { label: 'Pessoas', to: '/app/pessoas', icon: Users, area: 'Clube', permission: 'people.view' },
      { label: 'Diretoria', to: '/app/diretoria', icon: Shield, area: 'Clube', permission: 'squad.view' },
      { label: 'Jogadores', to: '/app/jogadores', icon: UserCog, area: 'Clube', permission: 'squad.view' },
      { label: 'Comissão Técnica', to: '/app/comissao-tecnica', icon: ClipboardList, area: 'Clube', permission: 'squad.view' },
    ],
  },
  {
    title: 'Futebol',
    items: [
      { label: 'Calendário', to: '/app/calendario', icon: CalendarDays, area: 'Futebol', permission: 'football.view' },
      { label: 'Jogos', to: '/app/jogos', icon: Swords, area: 'Futebol', permission: 'football.view' },
      { label: 'Campeonatos', to: '/app/campeonatos', icon: Trophy, area: 'Futebol', permission: 'football.view' },
      { label: 'Treinamentos', to: '/app/treinamentos', icon: Dumbbell, area: 'Futebol', permission: 'football.view' },
      { label: 'Escalações', to: '/app/escalacoes', icon: ClipboardList, area: 'Futebol', permission: 'football.view' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Mensalidades', to: '/app/mensalidades', icon: Receipt, area: 'Financeiro', permission: 'finance.view' },
      { label: 'Entradas', to: '/app/entradas', icon: ArrowDownLeft, area: 'Financeiro', permission: 'finance.view' },
      { label: 'Saídas', to: '/app/saidas', icon: ArrowUpRight, area: 'Financeiro', permission: 'finance.view' },
      { label: 'Fluxo de Caixa', to: '/app/fluxo-de-caixa', icon: Wallet, area: 'Financeiro', permission: 'finance.view' },
    ],
  },
  {
    title: 'Patrimônio',
    items: [{ label: 'Estoque', to: '/app/estoque', icon: Boxes, area: 'Patrimônio', permission: 'inventory.view' }],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Relatórios', to: '/app/relatorios', icon: FileBarChart, area: 'Gestão', permission: 'reports.view' },
      { label: 'Configurações', to: '/app/configuracoes', icon: Settings, area: 'Gestão', permission: 'settings.view' },
    ],
  },
];

export const allNavItems = navigation.flatMap((section) => section.items);

export const findNavItem = (pathname: string) =>
  allNavItems
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
