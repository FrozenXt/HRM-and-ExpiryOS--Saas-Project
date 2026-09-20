import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getCompanies({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/companies/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function createCompany(payload) {
  return axios.post(`${API_BASE}/companies/register`, payload, {
    headers: authHeaders(),
  });
}

export async function updateCompany(id, payload) {
  return axios.patch(`${API_BASE}/companies/${id}`, payload, {
    headers: authHeaders(),
  });
}
