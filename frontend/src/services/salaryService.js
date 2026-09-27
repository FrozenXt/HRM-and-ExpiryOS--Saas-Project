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

export const getSalaryStructures = (opts) => list("salary-structures", opts);

export const getSalaryStructure = (id) =>
  axios.get(`${API_BASE}/salary-structures/${id}`, {
    headers: authHeaders(),
  });

export const createSalaryStructure = (payload) =>
  axios.post(`${API_BASE}/salary-structures`, payload, {
    headers: authHeaders(),
  });

// The API exposes this as PUT, not PATCH, so send the full structure back.
export const updateSalaryStructure = (id, payload) =>
  axios.put(`${API_BASE}/salary-structures/${id}`, payload, {
    headers: authHeaders(),
  });

export const deleteSalaryStructure = (id) =>
  axios.delete(`${API_BASE}/salary-structures/${id}`, {
    headers: authHeaders(),
  });
