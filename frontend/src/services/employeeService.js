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

export const getEmployees = (opts) => list("employees", opts);

export const createEmployee = (payload) =>
  axios.post(`${API_BASE}/employees`, payload, { headers: authHeaders() });

export const updateEmployee = (id, payload) =>
  axios.patch(`${API_BASE}/employees/${id}`, payload, {
    headers: authHeaders(),
  });

export const deleteEmployee = (id) =>
  axios.delete(`${API_BASE}/employees/${id}`, { headers: authHeaders() });

/**
 * Rows of any list resource ("users", "departments", "designations",
 * "employees", "companies"), optionally scoped to one company.
 */
export async function listOptions(resource, companyId) {
  const fields = companyId
    ? [{ field: "companyId", operator: "eq", value: companyId }]
    : [];
  const res = await list(resource, { limit: 100, sort: "ASC", fields });
  return res.data.data.data;
}
