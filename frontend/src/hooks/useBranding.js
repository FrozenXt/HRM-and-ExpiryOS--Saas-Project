// src/hooks/useBranding.js
//
// Colors are resolved per logged-in user, in this order:
//   1. the user's personal choice   (localStorage "wp-user-prefs:<userId>")
//   2. their company's default      (cached "wp-branding:<companyId>")
//   3. the app's built-in CSS defaults
//
// Nothing here uses a shared "current company" pointer any more, so one
// login can never pick up another login's colors.
import { useEffect } from "react";
import { getCompanySettings } from "../services/settingsService";
import { getCurrentUser, currentUserId } from "../utils/auth";

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

/* ---------- storage ---------- */

const companyBrandKey = (companyId) => `wp-branding:${companyId}`;
const personalKey = (userId) => `wp-user-prefs:${userId}`;

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

// Who is logged in right now (user id + their own company id).
export function getSessionIds() {
  const me = getCurrentUser();
  const company = me?.companyId;
  return {
    userId: currentUserId(),
    companyId: company ? String(company._id || company) : null,
  };
}

/* ---- personal (per-user) preferences: { primaryColor, secondaryColor, theme } ---- */

export const getPersonalPrefs = (userId = getSessionIds().userId) =>
  userId ? read(personalKey(userId)) : null;

export function savePersonalPrefs(userId, patch) {
  if (!userId) return;
  write(personalKey(userId), {
    ...(read(personalKey(userId)) || {}),
    ...patch,
  });
}

export function clearPersonalPrefs(userId) {
  if (!userId) return;
  try {
    localStorage.removeItem(personalKey(userId));
  } catch {
    /* ignore */
  }
}

/* ---- company default, cached so colors paint before the fetch returns ---- */

export function cacheCompanyBranding(companyId, branding) {
  if (!companyId || !branding) return;
  write(companyBrandKey(companyId), {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    defaultTheme: branding.defaultTheme,
  });
}

export const getCachedCompanyBranding = (companyId) =>
  companyId ? read(companyBrandKey(companyId)) : null;

/* ---------- write CSS variables on <html> ---------- */

const BRAND_VARS = [
  "--blue",
  "--blue-dark",
  "--blue-soft",
  "--brand-secondary",
  "--brand-secondary-dark",
  "--brand-on-primary",
];

// Back to the stylesheet's built-in colors.
export function resetBranding() {
  const style = document.documentElement.style;
  BRAND_VARS.forEach((v) => style.removeProperty(v));
}

// Paints the given colors. (Third argument kept so old calls still work; it is ignored.)
export function applyBranding(primaryColor, secondaryColor) {
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
}

export function applyTheme(theme) {
  document.documentElement.setAttribute(
    "data-theme",
    theme === "dark" ? "dark" : "light",
  );
}

/* ---------- resolution: personal > company > defaults ---------- */

export function resolveBranding(companyBrand, userId = getSessionIds().userId) {
  const p = getPersonalPrefs(userId) || {};
  const c = companyBrand || {};
  return {
    primaryColor: p.primaryColor || c.primaryColor || null,
    secondaryColor: p.secondaryColor || c.secondaryColor || null,
    theme: p.theme || c.defaultTheme || null,
  };
}

// Paints the effective colors (does not touch light/dark; ThemeContext owns that).
export function applyEffectiveBranding(companyBrand, userId) {
  const r = resolveBranding(companyBrand, userId);
  if (r.primaryColor) applyBranding(r.primaryColor, r.secondaryColor);
  else resetBranding();
  return r;
}

// Paint from cache for the logged-in user, with no network call.
export function applyStoredBranding() {
  const { userId, companyId } = getSessionIds();
  applyEffectiveBranding(getCachedCompanyBranding(companyId), userId);
}

/* ---------- optional hook (kept for existing imports) ---------- */
export function useBranding() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await getCompanySettings();
        if (cancelled) return;
        const b = res?.data?.data?.branding || {};
        cacheCompanyBranding(getSessionIds().companyId, b);
        applyEffectiveBranding(b);
      } catch {
        /* non-fatal */
      }
    })();

    // Re-tint the soft color when light/dark flips.
    const observer = new MutationObserver(() => applyStoredBranding());
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
