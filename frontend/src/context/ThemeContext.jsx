// src/context/ThemeContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { myCompanyId } from "../utils/auth"; // adjust path

const ThemeContext = createContext({
  theme: "light",
  toggleTheme: () => {},
  setThemeExplicit: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // Try the current company's cached theme first, fall back to global
    const id = localStorage.getItem("wp-current-company");
    if (id) {
      const scoped = localStorage.getItem(`wp-theme:${id}`);
      if (scoped) return scoped;
    }
    return localStorage.getItem("wp-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);

    // Global fallback
    localStorage.setItem("wp-theme", theme);

    // Per-company cache
    const id = localStorage.getItem("wp-current-company");
    if (id) localStorage.setItem(`wp-theme:${id}`, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const setThemeExplicit = (value) =>
    setTheme(value === "dark" ? "dark" : "light");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeExplicit }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
