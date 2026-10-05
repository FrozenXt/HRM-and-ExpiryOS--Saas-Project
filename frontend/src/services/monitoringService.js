import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

// Bump this whenever the policy text shown in ConsentModal changes — each
// consent record stores the version the employee actually agreed to.
export const CURRENT_POLICY_VERSION = "v1.0";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
const h = () => ({ headers: authHeaders() });

const list = (
  resource,
  {
    page = 1,
    limit = 20,
    sort = "DESC",
    sort_field = "createdAt",
    fields = [],
  } = {},
) =>
  axios.post(
    `${API_BASE}/${resource}/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

/* ---------- Screenshots ---------- */
export const getScreenshots = (opts = {}) =>
  list("screenshots", { sort_field: "capturedAt", ...opts });

export const getScreenshot = (id) =>
  axios.get(`${API_BASE}/screenshots/${id}`, h());

// Assumption: the flag endpoint takes { isFlagged: boolean } (the docs show
// no body). Adjust here if your controller expects something else.
export const flagScreenshot = (id, isFlagged) =>
  axios.put(`${API_BASE}/screenshots/${id}/flag`, { isFlagged }, h());

export const deleteScreenshot = (id) =>
  axios.delete(`${API_BASE}/screenshots/${id}`, h());

// Used by the employee's device agent, not by any page in this web app.
// FormData fields: sessionId*, file*, capturedAt, isBlurred, activeAppName.
export const uploadScreenshot = (formData) =>
  axios.post(`${API_BASE}/screenshots`, formData, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });

/* ---------- Monitoring consent ---------- */
export const getMyConsent = () =>
  axios.get(`${API_BASE}/monitoring-consents/me`, h());

// Append-only: revoking is a NEW record with consentGiven=false.
export const recordConsent = (
  consentGiven,
  policyVersion = CURRENT_POLICY_VERSION,
) =>
  axios.post(
    `${API_BASE}/monitoring-consents`,
    { consentGiven, policyVersion },
    h(),
  );

export const getConsents = (opts = {}) =>
  list("monitoring-consents", { sort_field: "consentDate", ...opts });

export const getConsent = (id) =>
  axios.get(`${API_BASE}/monitoring-consents/${id}`, h());
