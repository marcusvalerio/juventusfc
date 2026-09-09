import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from './SessionContext';
import { RouteFallback } from './RouteFallback';
import { EmptyState } from '@/components/ui/States';
import { LinkButton } from '@/components/ui/Button';
import { ShieldOff } from 'lucide-react';

/**
 * Gate for the authenticated area. Routing is a convenience — the API refuses
 * unauthorised calls regardless of what the client renders.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status, account, needsOnboarding } = useSession();
  const location = useLocation();

  if (status === 'loading') return <RouteFallback />;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  if (!account) return <Navigate to="/entrar" state={{ from: location.pathname }} replace />;

  return <>{children}</>;
}

/** Blocks a section the account has no capability for. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { can } = useSession();

  if (!can(permission)) {
    return (
      <EmptyState
        icon={<ShieldOff className="text-danger" />}
        title="Sem autorização"
        description="Sua conta não tem permissão para acessar esta área. Fale com a administração do clube."
        action={
          <LinkButton to="/app" variant="secondary" size="sm">
            Voltar ao dashboard
          </LinkButton>
        }
      />
    );
  }

  return <>{children}</>;
}
