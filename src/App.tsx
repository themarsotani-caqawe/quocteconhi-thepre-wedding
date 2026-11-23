import { useCallback, useEffect, useState } from 'react';
import { GoogleSheetPage } from './pages/GoogleSheetPage';
import { HomePage } from './pages/HomePage';
import { PremiereEventPage } from './pages/PremiereEventPage';

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export default function App() {
  const [path, setPath] = useState<string>(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    const normalized = normalizePath(nextPath);
    if (normalizePath(window.location.pathname) !== normalized) {
      window.history.pushState({}, '', nextPath);
    }
    setPath(normalized);
  }, []);

  if (path === '/the-pre-wedding-premiere') {
    return <PremiereEventPage />;
  }

  if (path === '/google-sheet') {
    return <GoogleSheetPage onNavigate={navigate} />;
  }

  return <HomePage onNavigate={navigate} />;
}
