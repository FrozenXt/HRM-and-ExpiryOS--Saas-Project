import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getStatutoryDetails({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/employee-statutory-details/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function getStatutoryDetail(id) {
  return axios.get(`${API_BASE}/employee-statutory-details/${id}`, {
    headers: authHeaders(),
  });
}

export async function createStatutoryDetail(payload) {
  return axios.post(`${API_BASE}/employee-statutory-details`, payload, {
    headers: authHeaders(),
  });
}

export async function updateStatutoryDetail(id, payload) {
  return axios.put(`${API_BASE}/employee-statutory-details/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteStatutoryDetail(id) {
  return axios.delete(`${API_BASE}/employee-statutory-details/${id}`, {
    headers: authHeaders(),
  });
}
