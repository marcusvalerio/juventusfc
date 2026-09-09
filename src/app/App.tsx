import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from './SessionContext';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <AppRoutes />
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
