// src/services/advanceSalaryService.js
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

export const getAdvanceSalaries = (opts) => list("advance-salaries", opts);

export const getAdvanceSalary = (id) =>
  axios.get(`${API_BASE}/advance-salaries/${id}`, { headers: authHeaders() });

// Staff request their own advance: { amount, installments, reason }.
// No employeeId is sent; the server uses the logged-in user's token.
export const createAdvanceSalary = (payload) =>
  axios.post(`${API_BASE}/advance-salaries`, payload, {
    headers: authHeaders(),
  });

// Admin / HR: approve or reject.
// ASSUMPTION: body is { status: "approved" | "rejected", remarks, startPeriod }.
// I haven't seen the PATCH /:id/review schema; if it differs (for example it
// uses "action" instead of "status"), this is the one function to change.
export const reviewAdvanceSalary = (id, { status, remarks, startPeriod }) => {
  const body = { status };
  if (remarks) body.remarks = remarks;
  if (startPeriod) body.startPeriod = startPeriod;
  return axios.patch(`${API_BASE}/advance-salaries/${id}/review`, body, {
    headers: authHeaders(),
  });
};

// Staff: cancel their own pending request.
export const cancelAdvanceSalary = (id) =>
  axios.patch(
    `${API_BASE}/advance-salaries/${id}/cancel`,
    {},
    { headers: authHeaders() },
  );

export const deleteAdvanceSalary = (id) =>
  axios.delete(`${API_BASE}/advance-salaries/${id}`, {
    headers: authHeaders(),
  });
