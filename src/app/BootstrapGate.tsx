import { RotateCw } from 'lucide-react';
import { useSession } from './SessionContext';
import { RouteFallback } from './RouteFallback';
import { PublicScreen } from '@/layouts/PublicScreen';
import { Button } from '@/components/ui/Button';

/**
 * Every public screen has to wait for /api/bootstrap before deciding anything.
 *
 * Until it answers, `needsOnboarding` is still false and `account` is still
 * null — the same values a configured instance with a signed-out visitor has.
 * Branching on them early is what made a clean install show a login form, and
 * made /onboarding bounce through /entrar and back.
 */
export function BootstrapGate({ children }: { children: React.ReactNode }) {
  const { status, error, refreshBootstrap } = useSession();

  if (status === 'loading') return <RouteFallback />;

  if (status === 'error') {
    return (
      <PublicScreen eyebrow="Falha ao iniciar" title="Sem conexão">
        <div className="rounded-lg border border-line bg-graphite p-6 text-center">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Não foi possível falar com o servidor para saber o estado da instalação.
            {error ? ` (${error})` : ''}
          </p>
          <p className="mt-3 text-2xs leading-relaxed text-ink-faint">
            Isto não significa que falta configurar o clube — apenas que a verificação
            não pôde ser feita agora.
          </p>
          <Button
            variant="secondary"
            icon={<RotateCw />}
            className="mt-5"
            onClick={() => void refreshBootstrap()}
          >
            Tentar novamente
          </Button>
        </div>
      </PublicScreen>
    );
  }

  return <>{children}</>;
}
