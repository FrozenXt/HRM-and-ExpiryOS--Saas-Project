// src/context/ThemeContext.jsx
//
// Light/dark is resolved per user:
//   personal choice  ->  company default  ->  "light"
// Toggling in the navbar saves a personal choice for this user only.
import { createContext, useContext, useEffect, useState } from "react";
import {
  applyStoredBranding,
  getCachedCompanyBranding,
  getPersonalPrefs,
  getSessionIds,
  savePersonalPrefs,
} from "../hooks/useBranding";

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
  setThemeExplicit: () => {},
  setPersonalTheme: () => {},
  clearPersonalTheme: () => {},
});

const norm = (v) => (v === "dark" ? "dark" : "light");

function resolveTheme() {
  const { userId, companyId } = getSessionIds();
  const personal = getPersonalPrefs(userId)?.theme;
  if (personal) return norm(personal);
  return norm(getCachedCompanyBranding(companyId)?.defaultTheme);
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    applyStoredBranding(); // re-tint the soft brand color for this mode
  }, [theme]);

  useEffect(() => {
    // Company default arrived: use it only if the user has no personal choice.
    const onCompany = (e) => {
      const { userId } = getSessionIds();
      if (getPersonalPrefs(userId)?.theme) return;
      if (e.detail?.defaultTheme) setTheme(norm(e.detail.defaultTheme));
    };
    // Login / logout: pick up the new user's theme.
    const onSession = () => setTimeout(() => setTheme(resolveTheme()), 0);

    window.addEventListener("company-branding-loaded", onCompany);
    window.addEventListener("session-changed", onSession);
    return () => {
      window.removeEventListener("company-branding-loaded", onCompany);
      window.removeEventListener("session-changed", onSession);
    };
  }, []);

  // A personal choice, saved for this user only.
  const setPersonalTheme = (value) => {
    const next = norm(value);
    savePersonalPrefs(getSessionIds().userId, { theme: next });
    setTheme(next);
  };

  // Drop the personal choice and go back to the company default.
  const clearPersonalTheme = () => {
    savePersonalPrefs(getSessionIds().userId, { theme: undefined });
    setTheme(resolveTheme());
  };

  const toggleTheme = () =>
    setPersonalTheme(theme === "light" ? "dark" : "light");

  // Changes what is shown without saving a personal choice
  // (used by Company Settings to preview the company default).
  const setThemeExplicit = (value) => setTheme(norm(value));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setThemeExplicit,
        setPersonalTheme,
        clearPersonalTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
