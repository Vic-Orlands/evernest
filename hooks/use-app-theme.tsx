import { createContext, ReactNode, use, useEffect, useMemo, useState } from "react";
import { secureGet, secureSet } from "@/lib/secure-store";
import { resolveGradients, resolveTheme } from "@/lib/theme";
import { ThemePreference } from "@/lib/types";

const THEME_STORAGE_KEY = "preferences.theme.v1";

type ThemeContextValue = {
  themeName: ThemePreference;
  setThemeName: (next: ThemePreference) => Promise<void>;
  colors: ReturnType<typeof resolveTheme>;
  gradients: ReturnType<typeof resolveGradients>;
  isDark: boolean;
  ready: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const stored = await secureGet(THEME_STORAGE_KEY);
      if (!active) return;
      if (stored === "light" || stored === "dark") {
        setThemeNameState(stored);
      }
      setReady(true);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      setThemeName: async (next) => {
        setThemeNameState(next);
        await secureSet(THEME_STORAGE_KEY, next);
      },
      colors: resolveTheme(themeName),
      gradients: resolveGradients(themeName),
      isDark: themeName === "dark",
      ready
    }),
    [ready, themeName]
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useAppTheme() {
  const value = use(ThemeContext);
  if (!value) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return value;
}
