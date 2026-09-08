import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppLayout } from '@/layouts/AppLayout';
import { RouteFallback } from './RouteFallback';

const HomePage = lazy(() => import('@/pages/HomePage'));
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

export function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense fallback={<RouteFallback />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<HomePage />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="pessoas" element={<PeoplePage />} />
            <Route path="diretoria" element={<BoardPage />} />
            <Route path="jogadores" element={<PlayersPage />} />
            <Route path="jogadores/:playerId" element={<PlayerDetailPage />} />
            <Route path="comissao-tecnica" element={<StaffPage />} />
            <Route path="calendario" element={<CalendarPage />} />
            <Route path="jogos" element={<MatchesPage />} />
            <Route path="campeonatos" element={<CompetitionsPage />} />
            <Route path="treinamentos" element={<TrainingsPage />} />
            <Route path="escalacoes" element={<LineupsPage />} />
            <Route path="mensalidades" element={<DuesPage />} />
            <Route path="entradas" element={<IncomePage />} />
            <Route path="saidas" element={<ExpensesPage />} />
            <Route path="fluxo-de-caixa" element={<CashFlowPage />} />
            <Route path="estoque" element={<InventoryPage />} />
            <Route path="relatorios" element={<ReportsPage />} />
            <Route path="configuracoes" element={<SettingsPage />} />
          </Route>

          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}
