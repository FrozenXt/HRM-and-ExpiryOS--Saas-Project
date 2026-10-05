// src/services/resignationService.js
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

export const getResignations = (opts) => list("resignations", opts);

export const getResignation = (id) =>
  axios.get(`${API_BASE}/resignations/${id}`, { headers: authHeaders() });

// Staff submit their own: { reason, proposedLastWorkingDay }.
// No employeeId is sent; the server uses the logged-in user's token.
export const createResignation = (payload) =>
  axios.post(`${API_BASE}/resignations`, payload, { headers: authHeaders() });

// Admin / HR: approve or reject.
// ASSUMPTION: body is { status: "approved" | "rejected", remarks, lastWorkingDay }.
// I haven't seen the PATCH /:id/review schema; if it differs (for example it
// uses "action" instead of "status"), this is the one function to change.
export const reviewResignation = (id, { status, remarks, lastWorkingDay }) => {
  const body = { status };
  if (remarks) body.remarks = remarks;
  if (lastWorkingDay) body.lastWorkingDay = lastWorkingDay;
  return axios.patch(`${API_BASE}/resignations/${id}/review`, body, {
    headers: authHeaders(),
  });
};

// Staff: withdraw their own resignation.
export const withdrawResignation = (id) =>
  axios.patch(
    `${API_BASE}/resignations/${id}/withdraw`,
    {},
    { headers: authHeaders() },
  );

export const deleteResignation = (id) =>
  axios.delete(`${API_BASE}/resignations/${id}`, { headers: authHeaders() });
