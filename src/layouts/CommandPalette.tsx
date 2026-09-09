import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { modalVariants, overlayVariants } from '@/lib/motion';
import { allNavItems } from '@/app/navigation';
import { matchLabel } from '@/services/analytics';
import { formatDateShort } from '@/lib/dates';
import { useAsync } from '@/hooks/useAsync';
import { matchesRepo, playersRepo } from '@/services';
import { useSession } from '@/app/SessionContext';

interface Command {
  id: string;
  label: string;
  hint: string;
  group: string;
  to: string;
}

/** Cmd/Ctrl+K navigation across sections, squad and fixtures. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { can } = useSession();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Loaded once the palette is first opened, and only for what the account may see.
  const squad = useAsync(
    async () => (open && can('squad.view') ? await playersRepo.list() : []),
    [open, can],
  );
  const fixtures = useAsync(
    async () => (open && can('football.view') ? await matchesRepo.list() : []),
    [open, can],
  );

  const commands = useMemo<Command[]>(
    () => [
      ...allNavItems
        .filter((item) => can(item.permission))
        .map((item) => ({
          id: `nav-${item.to}`,
          label: item.label,
          hint: item.area,
          group: 'Navegação',
          to: item.to,
        })),
      ...(squad.data ?? []).map((player) => ({
        id: `ply-${player.id}`,
        label: player.name,
        hint: `${player.position} · ${player.team}`,
        group: 'Jogadores',
        to: `/app/jogadores/${player.id}`,
      })),
      ...(fixtures.data ?? []).slice(0, 12).map((match) => ({
        id: `mtc-${match.id}`,
        label: matchLabel(match),
        hint: formatDateShort(match.date),
        group: 'Jogos',
        to: '/app/jogos',
      })),
    ],
    [squad.data, fixtures.data, can],
  );

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle
      ? commands.filter(
          (command) =>
            command.label.toLowerCase().includes(needle) || command.hint.toLowerCase().includes(needle),
        )
      : commands.filter((command) => command.group === 'Navegação');
    return list.slice(0, 8);
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (event.key === 'Enter' && results[cursor]) {
        event.preventDefault();
        navigate(results[cursor].to);
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, results, cursor, navigate, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-onyx/85 backdrop-blur-[3px]"
          />
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="dialog"
            aria-label="Busca rápida"
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line-strong bg-elevated shadow-float"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-ghost" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar seções, jogadores ou jogos…"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-ghost"
              />
              <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-ghost">esc</kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-1.5">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-ink-faint">
                  Nada encontrado para “{query}”.
                </p>
              ) : (
                results.map((command, index) => (
                  <button
                    key={command.id}
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      navigate(command.to);
                      onClose();
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors duration-100',
                      index === cursor ? 'bg-surface-hover' : 'hover:bg-surface-raised',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{command.label}</span>
                      <span className="block truncate text-2xs text-ink-faint">{command.hint}</span>
                    </span>
                    <span className="shrink-0 text-2xs text-ink-ghost">{command.group}</span>
                    {index === cursor && <CornerDownLeft className="h-3 w-3 shrink-0 text-gold" aria-hidden />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
