import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

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
    { headers: authHeaders() },
  );

// --- Assets ---
export const getAssets = (opts) => list("assets", opts);
export const getAsset = (id) =>
  axios.get(`${API_BASE}/assets/${id}`, { headers: authHeaders() });
export const createAsset = (payload) =>
  axios.post(`${API_BASE}/assets`, payload, { headers: authHeaders() });
export const updateAsset = (id, payload) =>
  axios.put(`${API_BASE}/assets/${id}`, payload, { headers: authHeaders() });
export const deleteAsset = (id) =>
  axios.delete(`${API_BASE}/assets/${id}`, { headers: authHeaders() });

// --- Asset Assignments ---
export const getAssetAssignments = (opts) => list("asset-assignments", opts);
export const createAssetAssignment = (payload) =>
  axios.post(`${API_BASE}/asset-assignments`, payload, {
    headers: authHeaders(),
  });
export const returnAssetAssignment = (id, payload) =>
  axios.post(`${API_BASE}/asset-assignments/${id}/return`, payload, {
    headers: authHeaders(),
  });
export const deleteAssetAssignment = (id) =>
  axios.delete(`${API_BASE}/asset-assignments/${id}`, {
    headers: authHeaders(),
  });
