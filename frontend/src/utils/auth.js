// Who is logged in? Reads the user saved at login, and falls back to the
// JWT payload. Returns null if neither is available.
export function getCurrentUser() {
  try {
    const stored = JSON.parse(localStorage.getItem("user"));
    if (stored?.role) return stored;
  } catch {
    /* ignore */
  }
  try {
    const token = localStorage.getItem("accessToken");
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const p = JSON.parse(atob(b64));
    if (p.role)
      return { id: p.sub, role: p.role, companyId: p.companyId || null };
  } catch {
    /* ignore */
  }
  return null;
}

// Only a known non-super-admin (admin / hr / staff) is treated as company-scoped.
// Unknown user -> show the company field; the backend still enforces access.
export function isSuperAdmin() {
  const me = getCurrentUser();
  return !me || me.role === "super_admin";
}

export const myCompanyId = () => getCurrentUser()?.companyId || "";
