import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/layouts/AppLayout';
import { RouteFallback } from './RouteFallback';
import { RequireAuth, RequirePermission } from './guards';
import { BootstrapGate } from './BootstrapGate';

const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const PeoplePage = lazy(() => import('@/pages/club/PeoplePage'));
const BoardPage = lazy(() => import('@/pages/club/BoardPage'));
const PlayersPage = lazy(() => import('@/pages/club/PlayersPage'));
const PlayerDetailPage = lazy(() => import('@/pages/club/PlayerDetailPage'));
const StaffPage = lazy(() => import('@/pages/club/StaffPage'));
const CalendarPage = lazy(() => import('@/pages/football/CalendarPage'));
const MatchesPage = lazy(() => import('@/pages/football/MatchesPage'));
const CompetitionsPage = lazy(() => import('@/pages/football/CompetitionsPage'));
const TrainingsPage = lazy(() => import('@/pages/football/TrainingsPage'));
const LineupsPage = lazy(() => import('@/pages/football/LineupsPage'));
const DuesPage = lazy(() => import('@/pages/finance/DuesPage'));
const IncomePage = lazy(() => import('@/pages/finance/IncomePage'));
const ExpensesPage = lazy(() => import('@/pages/finance/ExpensesPage'));
const CashFlowPage = lazy(() => import('@/pages/finance/CashFlowPage'));
const InventoryPage = lazy(() => import('@/pages/InventoryPage'));
const ReportsPage = lazy(() => import('@/pages/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/** Wraps a section in its capability check. */
const gated = (permission: string, element: React.ReactNode) => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          {/* Public screens wait for /api/bootstrap before deciding anything,
              so none of them renders against a state that is merely unknown. */}
          <Route
            path="/"
            element={
              <BootstrapGate>
                <HomePage />
              </BootstrapGate>
            }
          />
          <Route
            path="/entrar"
            element={
              <BootstrapGate>
                <LoginPage />
              </BootstrapGate>
            }
          />
          <Route
            path="/onboarding"
            element={
              <BootstrapGate>
                <OnboardingPage />
              </BootstrapGate>
            }
          />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={gated('dashboard.view', <DashboardPage />)} />
            <Route path="pessoas" element={gated('people.view', <PeoplePage />)} />
            <Route path="diretoria" element={gated('squad.view', <BoardPage />)} />
            <Route path="jogadores" element={gated('squad.view', <PlayersPage />)} />
            <Route path="jogadores/:playerId" element={gated('squad.view', <PlayerDetailPage />)} />
            <Route path="comissao-tecnica" element={gated('squad.view', <StaffPage />)} />
            <Route path="calendario" element={gated('football.view', <CalendarPage />)} />
            <Route path="jogos" element={gated('football.view', <MatchesPage />)} />
            <Route path="campeonatos" element={gated('football.view', <CompetitionsPage />)} />
            <Route path="treinamentos" element={gated('football.view', <TrainingsPage />)} />
            <Route path="escalacoes" element={gated('football.view', <LineupsPage />)} />
            <Route path="mensalidades" element={gated('finance.view', <DuesPage />)} />
            <Route path="entradas" element={gated('finance.view', <IncomePage />)} />
            <Route path="saidas" element={gated('finance.view', <ExpensesPage />)} />
            <Route path="fluxo-de-caixa" element={gated('finance.view', <CashFlowPage />)} />
            <Route path="estoque" element={gated('inventory.view', <InventoryPage />)} />
            <Route path="relatorios" element={gated('reports.view', <ReportsPage />)} />
            <Route path="configuracoes" element={gated('settings.view', <SettingsPage />)} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="/login" element={<Navigate to="/entrar" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
