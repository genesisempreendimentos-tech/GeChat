import { useState, useEffect } from 'react';
import { LoadingGif } from '@/components/LoadingGif';

const LOADER_MIN_MS = 1000;
const LOADER_MAX_MS = 2500;

export function AppLoader({ children }: { children: React.ReactNode }) {
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const started = Date.now();
    let done = false;

    const tryHide = () => {
      if (done) return;
      const elapsed = Date.now() - started;
      const minReached = elapsed >= LOADER_MIN_MS;
      const maxReached = elapsed >= LOADER_MAX_MS;
      if (minReached && (document.readyState === 'complete' || maxReached)) {
        done = true;
        setShowLoader(false);
      }
    };

    if (document.readyState === 'complete') {
      const t = setTimeout(tryHide, LOADER_MIN_MS);
      return () => clearTimeout(t);
    }

    window.addEventListener('load', tryHide);
    const interval = setInterval(tryHide, 100);
    const maxTimeout = setTimeout(() => {
      done = true;
      setShowLoader(false);
    }, LOADER_MAX_MS);

    return () => {
      window.removeEventListener('load', tryHide);
      clearInterval(interval);
      clearTimeout(maxTimeout);
    };
  }, []);

  return (
    <>
      {children}
      {showLoader && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          aria-live="polite"
          aria-label="Carregando o site"
        >
          <LoadingGif size="xl" className="h-24 w-24 sm:h-32 sm:w-32" />
        </div>
      )}
    </>
  );
}
