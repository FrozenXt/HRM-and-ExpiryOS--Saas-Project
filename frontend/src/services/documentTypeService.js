import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getDocumentTypes({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "name",
  fields = [],
} = {}) {
  return axios.post(
    `${API_BASE}/document-types/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function createDocumentType(payload) {
  return axios.post(`${API_BASE}/document-types`, payload, {
    headers: authHeaders(),
  });
}

export async function updateDocumentType(id, payload) {
  return axios.patch(`${API_BASE}/document-types/${id}`, payload, {
    headers: authHeaders(),
  });
}
