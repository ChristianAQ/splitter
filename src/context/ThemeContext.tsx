import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { updateUserProfile } from "../services/users.service";
import { accentShadesByHex, DEFAULT_ACCENT_COLOR } from "../lib/accentColors";
import { hexToRgbTriplet } from "../lib/color";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  accentColor: string;
  setAccentColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
  accentColor: DEFAULT_ACCENT_COLOR,
  setAccentColor: () => {},
});

function applyTheme(theme: ThemePreference) {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

function applyAccentColor(hex: string) {
  const shades = accentShadesByHex(hex);
  const root = document.documentElement.style;
  for (const [shade, shadeHex] of Object.entries(shades)) {
    root.setProperty(`--accent-${shade}`, hexToRgbTriplet(shadeHex));
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [theme, setThemeState] = useState<ThemePreference>(
    () => (localStorage.getItem("splitter-theme") as ThemePreference) || "system"
  );
  const [accentColor, setAccentColorState] = useState<string>(
    () => localStorage.getItem("splitter-accent") || DEFAULT_ACCENT_COLOR
  );

  useEffect(() => {
    if (profile?.theme) setThemeState(profile.theme);
  }, [profile?.theme]);

  useEffect(() => {
    if (profile?.accentColor) setAccentColorState(profile.accentColor);
  }, [profile?.accentColor]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("splitter-theme", theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [theme]);

  useEffect(() => {
    applyAccentColor(accentColor);
    localStorage.setItem("splitter-accent", accentColor);
  }, [accentColor]);

  const setTheme = (next: ThemePreference) => {
    setThemeState(next);
    if (user) updateUserProfile(user.uid, { theme: next }).catch(() => {});
  };

  const setAccentColor = (hex: string) => {
    setAccentColorState(hex);
    if (user) updateUserProfile(user.uid, { accentColor: hex }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
