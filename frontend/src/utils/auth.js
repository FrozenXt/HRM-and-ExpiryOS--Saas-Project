import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  admin: "Admin",
  hr: "HR",
  staff: "Staff",
};

// Who is logged in? Reads the user saved at login, and falls back to the
// JWT payload (id / role / companyId only). Returns null if neither exists.
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

/* ---------- display helpers ---------- */
export const displayName = (user) =>
  user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.email || "User";

export const displayInitials = (user) => {
  if (user?.firstName) {
    return `${user.firstName[0]}${user.lastName?.[0] || ""}`.toUpperCase();
  }
  return (user?.email?.[0] || "U").toUpperCase();
};

export const roleLabel = (role) => ROLE_LABELS[role] || role || "";

/* ---------- session ---------- */
export const saveUser = (user) =>
  localStorage.setItem("user", JSON.stringify(user));

export function clearSession() {
  ["accessToken", "refreshToken", "user"].forEach((k) =>
    localStorage.removeItem(k),
  );
}

// Revokes the refresh token on the server (best effort), then clears local data.
export async function logout() {
  const refreshToken = localStorage.getItem("refreshToken");
  const accessToken = localStorage.getItem("accessToken");
  try {
    if (refreshToken) {
      await axios.post(
        `${API_BASE}/auth/logout`,
        { refreshToken },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
    }
  } catch {
    /* even if the server call fails, sign out locally */
  }
  clearSession();
}

// Fallback when only the JWT is available: load the user's name once.
export async function fetchCurrentUserProfile(id) {
  const res = await axios.get(`${API_BASE}/users/${id}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  return res.data.data;
}
