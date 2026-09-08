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
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

/** Single source of truth for the sidebar, breadcrumbs and command palette. */
export const navigation: NavSection[] = [
  {
    title: 'Início',
    items: [{ label: 'Dashboard', to: '/app', icon: LayoutDashboard, area: 'Início' }],
  },
  {
    title: 'Clube',
    items: [
      { label: 'Pessoas', to: '/app/pessoas', icon: Users, area: 'Clube' },
      { label: 'Diretoria', to: '/app/diretoria', icon: Shield, area: 'Clube' },
      { label: 'Jogadores', to: '/app/jogadores', icon: UserCog, area: 'Clube' },
      { label: 'Comissão Técnica', to: '/app/comissao-tecnica', icon: ClipboardList, area: 'Clube' },
    ],
  },
  {
    title: 'Futebol',
    items: [
      { label: 'Calendário', to: '/app/calendario', icon: CalendarDays, area: 'Futebol' },
      { label: 'Jogos', to: '/app/jogos', icon: Swords, area: 'Futebol' },
      { label: 'Campeonatos', to: '/app/campeonatos', icon: Trophy, area: 'Futebol' },
      { label: 'Treinamentos', to: '/app/treinamentos', icon: Dumbbell, area: 'Futebol' },
      { label: 'Escalações', to: '/app/escalacoes', icon: ClipboardList, area: 'Futebol' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Mensalidades', to: '/app/mensalidades', icon: Receipt, area: 'Financeiro' },
      { label: 'Entradas', to: '/app/entradas', icon: ArrowDownLeft, area: 'Financeiro' },
      { label: 'Saídas', to: '/app/saidas', icon: ArrowUpRight, area: 'Financeiro' },
      { label: 'Fluxo de Caixa', to: '/app/fluxo-de-caixa', icon: Wallet, area: 'Financeiro' },
    ],
  },
  {
    title: 'Patrimônio',
    items: [{ label: 'Estoque', to: '/app/estoque', icon: Boxes, area: 'Patrimônio' }],
  },
  {
    title: 'Gestão',
    items: [
      { label: 'Relatórios', to: '/app/relatorios', icon: FileBarChart, area: 'Gestão' },
      { label: 'Configurações', to: '/app/configuracoes', icon: Settings, area: 'Gestão' },
    ],
  },
];

export const allNavItems = navigation.flatMap((section) => section.items);

export const findNavItem = (pathname: string) =>
  allNavItems
    .filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
