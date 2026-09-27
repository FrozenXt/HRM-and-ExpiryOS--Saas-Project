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
  { page = 1, limit = 20, sort = "ASC", sort_field = "year", fields = [] } = {},
) =>
  axios.post(
    `${API_BASE}/${resource}/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );

export const getLeaveBalances = (opts) => list("leave-balances", opts);

export const getLeaveBalance = (id) =>
  axios.get(`${API_BASE}/leave-balances/${id}`, { headers: authHeaders() });

export const createLeaveBalance = (payload) =>
  axios.post(`${API_BASE}/leave-balances`, payload, { headers: authHeaders() });

// "Adjust a leave balance" — exposed as PUT per the API spec.
export const updateLeaveBalance = (id, payload) =>
  axios.put(`${API_BASE}/leave-balances/${id}`, payload, {
    headers: authHeaders(),
  });

export const deleteLeaveBalance = (id) =>
  axios.delete(`${API_BASE}/leave-balances/${id}`, { headers: authHeaders() });
