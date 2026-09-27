// src/hooks/useBranding.js
import { useEffect } from "react";
import { getCompanySettings } from "../services/settingsService";

/* ---------- color helpers ---------- */

function hexToRgb(hex) {
  const clean = String(hex).replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function toHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))))
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
  );
}

function darken(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - percent / 100;
  return toHex(r * f, g * f, b * f);
}

function lighten(hex, percent) {
  const { r, g, b } = hexToRgb(hex);
  const f = percent / 100;
  return toHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
}

/* Mix color A towards color B. weightB in 0..1 */
function mix(hexA, hexB, weightB = 0.5) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const m = (x, y) => x * (1 - weightB) + y * weightB;
  return toHex(m(a.r, b.r), m(a.g, b.g), m(a.b, b.b));
}

/* Is the color dark enough that white text should be used on top of it? */
function isDark(hex) {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.62;
}

/* ---------- core: write CSS variables on <html> ---------- */
const brandingKey = (companyId) =>
  companyId ? `wp-branding:${companyId}` : "wp-branding";
const themeKey = (companyId) =>
  companyId ? `wp-theme:${companyId}` : "wp-theme";

/* ---------- applyBranding: takes companyId, writes per-company cache ---------- */
export function applyBranding(primaryColor, secondaryColor, companyId) {
  if (!primaryColor || !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) return;

  const isDarkTheme =
    document.documentElement.getAttribute("data-theme") === "dark";
  const surfaceForSoft = isDarkTheme ? "#111a2e" : "#ffffff";

  const style = document.documentElement.style;
  style.setProperty("--blue", primaryColor);
  style.setProperty("--blue-dark", darken(primaryColor, 15));
  style.setProperty(
    "--blue-soft",
    isDarkTheme
      ? mix(primaryColor, surfaceForSoft, 0.82)
      : lighten(primaryColor, 88),
  );
  style.setProperty("--brand-secondary", secondaryColor || primaryColor);
  style.setProperty(
    "--brand-secondary-dark",
    darken(secondaryColor || primaryColor, 15),
  );
  style.setProperty(
    "--brand-on-primary",
    isDark(primaryColor) ? "#ffffff" : "#0f172a",
  );

  // Only cache when we know which company this belongs to
  if (companyId) {
    try {
      localStorage.setItem(
        brandingKey(companyId),
        JSON.stringify({
          primaryColor,
          secondaryColor: secondaryColor || primaryColor,
        }),
      );
    } catch {
      /* ignore */
    }
  }
}

/* ---------- applyTheme: same idea ---------- */
export function applyTheme(theme, companyId) {
  const next = theme === "dark" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  if (companyId) {
    try {
      localStorage.setItem(themeKey(companyId), next);
    } catch {
      /* ignore */
    }
  }
}

/* ---------- restore the cached branding/theme for a specific company ---------- */
export function applyStoredBranding(companyId) {
  try {
    // If we don't know the company yet (e.g. right at boot),
    // read the "last used company" pointer to guess.
    const resolvedId =
      companyId || localStorage.getItem("wp-current-company") || null;

    const raw = resolvedId
      ? localStorage.getItem(brandingKey(resolvedId))
      : null;
    if (!raw) return;

    const { primaryColor, secondaryColor } = JSON.parse(raw);
    applyBranding(primaryColor, secondaryColor, resolvedId);

    const savedTheme = resolvedId
      ? localStorage.getItem(themeKey(resolvedId))
      : null;
    if (savedTheme) applyTheme(savedTheme, resolvedId);
  } catch {
    /* ignore */
  }
}

/* ---------- hook: resolves the "current" company for this user ---------- */
export function useBranding() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getCompanySettings();
        if (cancelled) return;
        const data = res?.data?.data || {};
        const companyId = data.companyId || data._id || myCompanyId();

        // Remember which company this browser is currently showing
        if (companyId) {
          localStorage.setItem("wp-current-company", companyId);
        }

        const b = data.branding || {};
        if (b.primaryColor) {
          applyBranding(b.primaryColor, b.secondaryColor, companyId);
        }
        if (b.defaultTheme) {
          applyTheme(b.defaultTheme, companyId);
        }
      } catch {
        /* non-fatal */
      }
    })();

    // Re-apply soft tint when the theme flips, for the current company
    const observer = new MutationObserver(() => {
      try {
        const id = localStorage.getItem("wp-current-company");
        if (!id) return;
        const raw = localStorage.getItem(brandingKey(id));
        if (!raw) return;
        const { primaryColor, secondaryColor } = JSON.parse(raw);
        applyBranding(primaryColor, secondaryColor, id);
      } catch {
        /* ignore */
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);
}
