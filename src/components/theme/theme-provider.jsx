"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  THEME_STORAGE_KEY,
  persistThemeCookie,
  resolveTheme,
} from "@/components/theme/theme-storage";

const ThemeContext = createContext(null);

function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.classList.toggle("light", theme === "light");
}

function readLocalTheme(fallback) {
  if (typeof window === "undefined") {
    return fallback;
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark"
    ? stored
    : resolveTheme(fallback);
}

function initClientTheme(serverTheme) {
  const resolved = readLocalTheme(serverTheme);
  if (typeof window !== "undefined") {
    applyTheme(resolved);
  }
  return resolved;
}

export function ThemeProvider({ children, initialTheme = "dark" }) {
  const [theme, setThemeState] = useState(() => initClientTheme(initialTheme));

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    persistThemeCookie(theme);
    applyTheme(theme);
  }, [theme]);

  const persistTheme = useCallback((next) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    persistThemeCookie(next);
    applyTheme(next);
  }, []);

  const setTheme = useCallback(
    (next) => {
      setThemeState(next);
      persistTheme(next);
    },
    [persistTheme],
  );

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const next = current === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, [persistTheme]);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
