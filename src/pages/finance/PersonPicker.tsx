import { useMemo, useState } from 'react';
import { Check, UserRound, X } from 'lucide-react';
import { SearchInput } from '@/components/ui/Search';
import { cn } from '@/lib/cn';
import type { MembershipRole, Person } from '@/types/domain';

const ROLE_LABEL: Record<MembershipRole, string> = {
  jogador: 'Jogador',
  diretoria: 'Diretoria',
  comissao: 'Comissão',
  administrativo: 'Administrativo',
  outro: 'Outro',
};

/** "Jogador · Diretoria" — every link, so the person is never reduced to one. */
export const roleSummary = (roles: readonly string[] = []) =>
  roles.map((role) => ROLE_LABEL[role as MembershipRole] ?? role).join(' · ');

/**
 * Picks the person a charge belongs to.
 *
 * A club can register hundreds of people, so this searches instead of listing:
 * by name, nickname, document or e-mail. What it returns is always a person —
 * the links are shown only so the operator recognises who they picked.
 */
export function PersonPicker({
  id,
  people,
  value,
  onChange,
  invalid,
  emptyHint = 'Nenhuma pessoa encontrada.',
}: {
  id?: string;
  people: Person[];
  value: string;
  onChange: (person: Person) => void;
  invalid?: boolean;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState('');
  const selected = people.find((person) => person.id === value);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? people.filter((person) =>
          [person.fullName, person.nickname, person.document, person.email]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(needle)),
        )
      : people;
    return pool.slice(0, 40);
  }, [people, query]);

  if (selected) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-md border bg-surface-sunken px-3 py-2.5',
          invalid ? 'border-danger' : 'border-line-strong',
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-gold bg-gold-wash">
          <Check className="h-3.5 w-3.5 text-gold-light" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] text-ink">{selected.fullName}</span>
          <span className="block truncate text-2xs text-ink-faint">
            {roleSummary(selected.roles) || 'Sem vínculo esportivo'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            onChange({ ...selected, id: '' });
          }}
          className="shrink-0 rounded p-1 text-ink-faint transition-colors duration-150 hover:text-ink"
          aria-label={`Trocar ${selected.fullName}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border bg-surface-sunken', invalid ? 'border-danger' : 'border-line-strong')}>
      <div className="p-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Pesquisar pessoa…" />
      </div>
      <ul id={id} className="max-h-52 overflow-y-auto border-t border-line px-1 pb-1" role="listbox">
        {matches.length === 0 ? (
          <li className="px-3 py-4 text-center text-2xs text-ink-faint">{emptyHint}</li>
        ) : (
          matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => onChange(person)}
                className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left transition-colors duration-100 hover:bg-surface-hover"
              >
                <UserRound className="h-3.5 w-3.5 shrink-0 text-ink-ghost" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink-muted">{person.fullName}</span>
                  {roleSummary(person.roles) && (
                    <span className="block truncate text-2xs text-ink-ghost">{roleSummary(person.roles)}</span>
                  )}
                </span>
                {person.monthlyFeeEnabled && (
                  <span className="shrink-0 text-2xs uppercase tracking-label text-gold">Mensalista</span>
                )}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
