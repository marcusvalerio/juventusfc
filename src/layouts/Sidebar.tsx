import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PanelLeftClose, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE, springSoft } from '@/lib/motion';
import { findNavItem, navigation } from '@/app/navigation';
import { Wordmark } from '@/components/brand/Wordmark';
import { IconButton } from '@/components/ui/Button';
import { clubProfile } from '@/data/club';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

function NavItems({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  // Longest matching route wins, so /app/jogadores never lights up Dashboard too.
  const currentPath = findNavItem(pathname)?.to;

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-5" aria-label="Navegação principal">
      {navigation.map((section) => (
        <div key={section.title}>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: DUR.fast, ease: EASE }}
                className="eyebrow mb-2 overflow-hidden px-2.5"
              >
                {section.title}
              </motion.p>
            )}
          </AnimatePresence>

          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = currentPath === item.to;
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/app'}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] transition-colors duration-150',
                      active ? 'text-ink' : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active"
                        transition={springSoft}
                        className="absolute inset-0 rounded-md border border-line-gold bg-gold-wash"
                        aria-hidden
                      />
                    )}
                    <Icon
                      className={cn(
                        'relative z-10 h-4 w-4 shrink-0 transition-colors duration-150',
                        active ? 'text-gold' : 'text-ink-faint group-hover:text-ink-muted',
                      )}
                      aria-hidden
                    />
                    {!collapsed && <span className="relative z-10 truncate">{item.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <div className="border-t border-line px-5 py-4">
      <p className="text-2xs text-ink-ghost">
        {clubProfile.shortName} · Temporada {new Date().getFullYear()}
      </p>
      <p className="mt-0.5 text-2xs text-ink-ghost">Versão de demonstração</p>
    </div>
  );
}

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* Desktop rail */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 248 }}
        transition={springSoft}
        className="fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-graphite lg:flex"
      >
        <div className={cn('flex h-16 shrink-0 items-center border-b border-line', collapsed ? 'justify-center px-0' : 'justify-between px-5')}>
          {collapsed ? (
            <NavLink to="/" aria-label="Juventus F.C.">
              <Wordmark size="sm" withCrest className="[&>span:last-child]:hidden" />
            </NavLink>
          ) : (
            <>
              <NavLink to="/" aria-label="Juventus F.C.">
                <Wordmark size="sm" />
              </NavLink>
              <IconButton label="Recolher menu" onClick={onToggleCollapse} className="-mr-2 h-7 w-7">
                <PanelLeftClose />
              </IconButton>
            </>
          )}
        </div>

        <NavItems collapsed={collapsed} />

        {collapsed && (
          <div className="flex justify-center border-t border-line py-3">
            <IconButton label="Expandir menu" onClick={onToggleCollapse} className="h-7 w-7">
              <PanelLeftClose className="rotate-180" />
            </IconButton>
          </div>
        )}
        <SidebarFooter collapsed={collapsed} />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.base }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-onyx/80 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 42 }}
              className="absolute inset-y-0 left-0 flex w-[272px] flex-col border-r border-line bg-graphite"
            >
              <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
                <Wordmark size="sm" />
                <IconButton label="Fechar menu" onClick={onCloseMobile} className="-mr-2 h-7 w-7">
                  <X />
                </IconButton>
              </div>
              <NavItems collapsed={false} onNavigate={onCloseMobile} />
              <SidebarFooter collapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
