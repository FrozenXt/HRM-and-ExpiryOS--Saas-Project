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
    sort_field = "period",
    fields = [],
  } = {},
) =>
  axios.post(
    `${API_BASE}/${resource}/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );

export const getPayrolls = (opts) => list("payroll", opts);

export const getPayroll = (id) =>
  axios.get(`${API_BASE}/payroll/${id}`, { headers: authHeaders() });

export const createPayroll = (payload) =>
  axios.post(`${API_BASE}/payroll`, payload, { headers: authHeaders() });

// Draft-only per the API description — the backend should reject this for
// approved/released records.
export const updatePayroll = (id, payload) =>
  axios.put(`${API_BASE}/payroll/${id}`, payload, { headers: authHeaders() });

// Draft-only per the API description.
export const deletePayroll = (id) =>
  axios.delete(`${API_BASE}/payroll/${id}`, { headers: authHeaders() });

export const approvePayroll = (id) =>
  axios.post(
    `${API_BASE}/payroll/${id}/approve`,
    {},
    { headers: authHeaders() },
  );

// Payslip attachment isn't specced out yet — this releases without one.
// If releasing needs a file upload, switch to multipart/form-data here.
export const releasePayroll = (id) =>
  axios.post(
    `${API_BASE}/payroll/${id}/release`,
    {},
    { headers: authHeaders() },
  );

export const bulkReleasePayrolls = (ids) =>
  axios.post(
    `${API_BASE}/payroll/bulk-release`,
    { ids },
    { headers: authHeaders() },
  );
