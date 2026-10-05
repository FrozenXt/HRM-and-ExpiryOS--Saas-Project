import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
const h = () => ({ headers: authHeaders() });

export const getRegularizationRequests = ({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/regularization-requests/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const getRegularizationRequest = (id) =>
  axios.get(`${API_BASE}/regularization-requests/${id}`, h());

export const createRegularizationRequest = (payload) =>
  axios.post(`${API_BASE}/regularization-requests`, payload, h());

// Assumption: same { status: "approved" | "rejected" } shape as time-logs'
// review endpoint — adjust if your controller expects something else.
export const reviewRegularizationRequest = (id, status) =>
  axios.put(
    `${API_BASE}/regularization-requests/${id}/review`,
    { status },
    h(),
  );
