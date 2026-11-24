import { useCallback, useEffect, useState } from 'react';
import { HomePage } from './pages/HomePage';
import { PremiereEventPage } from './pages/PremiereEventPage';

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function hasOwnerParam(): boolean {
  return new URLSearchParams(window.location.search).get('owner') === 'true';
}

export default function App() {
  const [path, setPath] = useState<string>(() => normalizePath(window.location.pathname));
  const [ownerMode, setOwnerMode] = useState<boolean>(() => hasOwnerParam());

  useEffect(() => {
    const onPopState = () => {
      setPath(normalizePath(window.location.pathname));
      setOwnerMode(hasOwnerParam());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    const currentSearch = window.location.search;
    const targetUrl =
      currentSearch && !nextPath.includes('?') ? `${nextPath}${currentSearch}` : nextPath;
    const normalized = normalizePath(nextPath.split('?')[0] || '/');
    if (normalizePath(window.location.pathname) !== normalized) {
      window.history.pushState({}, '', targetUrl);
    }
    setPath(normalized);
    setOwnerMode(hasOwnerParam());
  }, []);

  if (path === '/the-pre-wedding-premiere' || ownerMode) {
    return <PremiereEventPage />;
  }

  return <HomePage onNavigate={navigate} />;
}
