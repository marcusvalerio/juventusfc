import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, ChevronRight, Command, Menu, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';
import { findNavItem } from '@/app/navigation';
import { viewer } from '@/data/club';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { IconButton } from '@/components/ui/Button';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/Dropdown';
import { relativeTime } from '@/lib/dates';
import { activityRecords } from '@/data/activity';

interface HeaderProps {
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
  collapsed: boolean;
}

export function Header({ onOpenMobileNav, onOpenSearch, collapsed }: HeaderProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const current = findNavItem(pathname);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-onyx/85 px-4 backdrop-blur-md transition-colors duration-200 sm:px-6',
        scrolled ? 'border-line' : 'border-transparent',
        collapsed ? 'lg:pl-6' : 'lg:pl-6',
      )}
    >
      <IconButton label="Abrir menu" onClick={onOpenMobileNav} className="lg:hidden">
        <Menu />
      </IconButton>

      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: DUR.base, ease: EASE }}
            className="min-w-0"
          >
            <nav aria-label="Trilha" className="flex items-center gap-1.5 text-2xs text-ink-ghost">
              <Link to="/app" className="transition-colors hover:text-ink-muted">
                {current?.area ?? 'Início'}
              </Link>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <span className="text-ink-faint">{current?.label ?? 'Dashboard'}</span>
            </nav>
            <h1 className="truncate font-heading text-[15px] font-medium tracking-editorial text-ink">
              {current?.label ?? 'Dashboard'}
            </h1>
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className={cn(
          'hidden h-9 w-56 items-center gap-2 rounded-md border border-line bg-surface-sunken px-3 text-[13px] text-ink-ghost',
          'transition-colors duration-150 hover:border-line-strong hover:text-ink-muted md:flex xl:w-64',
        )}
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="flex-1 text-left">Buscar no sistema</span>
        <kbd className="flex items-center gap-0.5 rounded border border-line px-1 py-0.5 text-[10px] text-ink-ghost">
          <Command className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      <IconButton label="Buscar" onClick={onOpenSearch} className="md:hidden">
        <Search />
      </IconButton>

      <Dropdown
        width="w-80"
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            aria-label="Notificações"
            className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-raised hover:text-ink"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
          </button>
        )}
      >
        {({ close }) => (
          <>
            <DropdownLabel>Atividade recente</DropdownLabel>
            {activityRecords.slice(0, 4).map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={close}
                className="flex w-full flex-col gap-0.5 rounded px-2.5 py-2 text-left transition-colors duration-100 hover:bg-surface-hover"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13px] text-ink">{record.title}</span>
                  <span className="shrink-0 text-2xs text-ink-ghost">{relativeTime(record.at)}</span>
                </span>
                <span className="truncate text-2xs text-ink-muted">{record.detail}</span>
              </button>
            ))}
          </>
        )}
      </Dropdown>

      <span className="mx-1 hidden h-5 w-px bg-line sm:block" aria-hidden />

      <Badge tone="gold" className="hidden lg:inline-flex">
        Demonstração
      </Badge>

      <Dropdown
        trigger={({ toggle }) => (
          <button
            type="button"
            onClick={toggle}
            className="flex items-center gap-2.5 rounded-md py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-surface-raised"
            aria-label="Conta"
          >
            <Avatar name={viewer.name} size="sm" tone="gold" />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-[13px] text-ink">{viewer.name}</span>
              <span className="block text-2xs text-ink-faint">{viewer.role}</span>
            </span>
          </button>
        )}
      >
        {({ close }) => (
          <>
            <DropdownLabel>Sessão de demonstração</DropdownLabel>
            <div className="px-2.5 pb-2 pt-1">
              <p className="text-[13px] text-ink">{viewer.name}</p>
              <p className="text-2xs text-ink-faint">
                Autenticação será habilitada na próxima etapa.
              </p>
            </div>
            <DropdownSeparator />
            <DropdownItem
              onClick={() => {
                close();
                navigate('/app/configuracoes');
              }}
            >
              Configurações do clube
            </DropdownItem>
            <DropdownItem
              onClick={() => {
                close();
                navigate('/');
              }}
            >
              Voltar ao portal
            </DropdownItem>
          </>
        )}
      </Dropdown>
    </header>
  );
}
