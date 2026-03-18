import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { CacheWarmupWidget } from '@/features/pocket/components/cache-warmup-widget';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PocketProvider } from '@/features/pocket/context/pocket-context';
import { ReaderPage } from '@/features/pocket/pages/reader-page';
import { SavesPage } from '@/features/pocket/pages/saves-page';

export default function App() {
  return (
    <TooltipProvider delayDuration={0}>
      <PocketProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={<SavesPage />}
            />
            <Route
              path="/reader/:itemId"
              element={<ReaderPage />}
            />
            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />
          </Routes>
          <CacheWarmupWidget />
        </BrowserRouter>
        <Toaster richColors />
      </PocketProvider>
    </TooltipProvider>
  );
}
