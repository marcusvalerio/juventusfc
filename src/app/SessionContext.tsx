import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, setUnauthorizedHandler } from '@/services/api';
import { setClubShortName } from '@/services/analytics';
import type { Club, ClubSettings, SessionAccount, Team } from '@/types/domain';

interface BootstrapPayload {
  needsOnboarding: boolean;
  club: { id: string; officialName: string; shortName: string; foundedYear: string; city: string; state: string; venue: string } | null;
  account: SessionAccount | null;
}

interface ClubPayload {
  club: Club;
  settings: ClubSettings | null;
  teams: Team[];
}

type Status = 'loading' | 'ready' | 'error';

interface SessionValue {
  status: Status;
  error?: string;
  needsOnboarding: boolean;
  account: SessionAccount | null;
  club: Club | null;
  settings: ClubSettings | null;
  teams: Team[];
  /** Club summary available before signing in (name shown on the portal). */
  publicClub: BootstrapPayload['club'];
  can: (permission: string) => boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  refreshClub: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/**
 * Owns everything the shell needs before any screen renders: whether the
 * instance is configured, who is signed in, and the club's reference data
 * (profile, settings and categories) that forms depend on.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string>();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [publicClub, setPublicClub] = useState<BootstrapPayload['club']>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [settings, setSettings] = useState<ClubSettings | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);

  const loadClub = useCallback(async () => {
    const payload = await apiFetch<ClubPayload>('/club');
    setClub(payload.club);
    setSettings(payload.settings);
    setTeams(payload.teams);
    setClubShortName(payload.club.shortName);
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const payload = await apiFetch<BootstrapPayload>('/bootstrap');
      setNeedsOnboarding(payload.needsOnboarding);
      setAccount(payload.account);
      setPublicClub(payload.club);
      if (payload.club) setClubShortName(payload.club.shortName);

      if (payload.account) {
        await loadClub();
      } else {
        setClub(null);
        setSettings(null);
        setTeams([]);
      }
      setStatus('ready');
      setError(undefined);
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Falha ao iniciar a aplicação.');
    }
  }, [loadClub]);

  useEffect(() => {
    void refreshBootstrap();
  }, [refreshBootstrap]);

  // A 401 from any call means the cookie expired or was revoked elsewhere.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAccount(null);
      setClub(null);
      setTeams([]);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const payload = await apiFetch<{ account: SessionAccount }>('/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      setAccount(payload.account);
      await loadClub();
    },
    [loadClub],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setAccount(null);
      setClub(null);
      setSettings(null);
      setTeams([]);
    }
  }, []);

  const can = useCallback(
    (permission: string) => {
      if (!account) return false;
      // The owner implicitly holds every capability; the API enforces the same rule.
      return account.isOwner || account.permissions.includes(permission);
    },
    [account],
  );

  const value = useMemo<SessionValue>(
    () => ({
      status,
      error,
      needsOnboarding,
      account,
      club,
      settings,
      teams,
      publicClub,
      can,
      login,
      logout,
      refreshBootstrap,
      refreshClub: loadClub,
    }),
    [status, error, needsOnboarding, account, club, settings, teams, publicClub, can, login, logout, refreshBootstrap, loadClub],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession precisa estar dentro de SessionProvider.');
  return context;
}

/** Convenience hook for permission-gated UI. */
export function usePermission(permission: string) {
  return useSession().can(permission);
}
