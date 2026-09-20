import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getDesignations({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "name",
  fields = [],
} = {}) {
  return axios.post(
    `${API_BASE}/designations/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function createDesignation(payload) {
  return axios.post(`${API_BASE}/designations`, payload, {
    headers: authHeaders(),
  });
}

export async function updateDesignation(id, payload) {
  return axios.put(`${API_BASE}/designations/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteDesignation(id) {
  return axios.delete(`${API_BASE}/designations/${id}`, {
    headers: authHeaders(),
  });
}
