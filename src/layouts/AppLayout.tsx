import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useDisclosure } from '@/hooks/useDisclosure';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from './CommandPalette';

const COLLAPSE_KEY = 'juventus:sidebar-collapsed';

export function AppLayout() {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const mobileNav = useDisclosure();
  const search = useDisclosure();

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Scroll resets between sections so a new page never opens mid-content.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        search.toggle();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [search]);

  return (
    <div className="min-h-screen bg-onyx">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileNav.isOpen}
        onCloseMobile={mobileNav.close}
      />

      <div
        className={cn(
          'min-h-screen transition-[padding-left] duration-300 ease-swift',
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[248px]',
        )}
      >
        <Header
          onOpenMobileNav={mobileNav.open}
          onOpenSearch={search.open}
          collapsed={collapsed}
        />

        <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <div key={pathname}>
              <Outlet />
            </div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={search.isOpen} onClose={search.close} />
    </div>
  );
}
