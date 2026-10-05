import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getPlans({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/plans/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

// Open to any authenticated role — used by the company-admin subscribe/
// upgrade screen to browse what's available.
export async function getActivePlans() {
  return axios.get(`${API_BASE}/plans/active`, { headers: authHeaders() });
}

export async function createPlan(payload) {
  return axios.post(`${API_BASE}/plans`, payload, { headers: authHeaders() });
}

export async function updatePlan(id, payload) {
  return axios.put(`${API_BASE}/plans/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deletePlan(id) {
  return axios.delete(`${API_BASE}/plans/${id}`, { headers: authHeaders() });
}
