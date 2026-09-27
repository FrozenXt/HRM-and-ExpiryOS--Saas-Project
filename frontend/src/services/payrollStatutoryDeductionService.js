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

export const getStatutoryDeductions = (opts) =>
  list("payroll-statutory-deductions", opts);

export const getStatutoryDeduction = (id) =>
  axios.get(`${API_BASE}/payroll-statutory-deductions/${id}`, {
    headers: authHeaders(),
  });

export const createStatutoryDeduction = (payload) =>
  axios.post(`${API_BASE}/payroll-statutory-deductions`, payload, {
    headers: authHeaders(),
  });

// One breakdown per payroll record, exposed as PUT per the API spec.
export const updateStatutoryDeduction = (id, payload) =>
  axios.put(`${API_BASE}/payroll-statutory-deductions/${id}`, payload, {
    headers: authHeaders(),
  });

export const deleteStatutoryDeduction = (id) =>
  axios.delete(`${API_BASE}/payroll-statutory-deductions/${id}`, {
    headers: authHeaders(),
  });

/**
 * Since it's one breakdown per payroll record, this is the lookup the form
 * actually needs: find it (if any) so the modal can decide create vs. edit.
 */
export async function getStatutoryDeductionForPayroll(payrollId) {
  const res = await getStatutoryDeductions({
    limit: 1,
    fields: [{ field: "payrollId", operator: "eq", value: payrollId }],
  });
  return res.data.data.data[0] || null;
}
