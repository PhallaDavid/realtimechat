import { useCallback, useEffect, useState } from 'react';
import { LEGACY_THEME_STORAGE_KEY, THEME_STORAGE_KEY } from '@/src/lib/brand';

export type Theme = 'light' | 'dark' | 'system';

function readStoredThemeRaw(): string | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) return stored;
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(THEME_STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getStoredTheme(): Theme {
  const stored = readStoredThemeRaw();
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function applyTheme(theme: Theme) {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(getStoredTheme())
  );

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyTheme(next);
    setResolvedTheme(resolveTheme(next));
  }, []);

  useEffect(() => {
    applyTheme(theme);
    setResolvedTheme(resolveTheme(theme));

    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyTheme('system');
      setResolvedTheme(resolveTheme('system'));
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  return { theme, setTheme, resolvedTheme, isDark: resolvedTheme === 'dark' };
}
