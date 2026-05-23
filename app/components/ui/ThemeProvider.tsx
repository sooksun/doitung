// app/components/ui/ThemeProvider.tsx
'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { IconMoon, IconSun } from './icons';

export type Theme = 'light' | 'dark';

// NOTE: 'token' and 'user' localStorage keys are reserved for auth — never reuse them.
const STORAGE_KEY = 'de-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(t: Theme) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', t);
  }
}

function persist(t: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    /* storage unavailable — ignore */
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);

  // Sync React state with the value the anti-FOUC inline script already applied.
  useEffect(() => {
    let initial: Theme = defaultTheme;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        initial = stored;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        initial = 'dark';
      }
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    applyTheme(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    persist(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      persist(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export interface ThemeToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
}

/** Small icon button that flips light/dark. Safe to use anywhere under ThemeProvider. */
export function ThemeToggle({ size = 'md', className, ...rest }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const classes = ['de-btn', 'de-btn--ghost', `de-btn--${size}`, className || '']
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      onClick={toggleTheme}
      aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
      aria-pressed={isDark}
      {...rest}
    >
      <span className="de-btn__icon" aria-hidden="true">
        {isDark ? <IconSun /> : <IconMoon />}
      </span>
    </button>
  );
}
