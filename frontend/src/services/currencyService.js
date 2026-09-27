import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getCurrencies({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/currencies/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function createCurrency(payload) {
  return axios.post(`${API_BASE}/currencies`, payload, {
    headers: authHeaders(),
  });
}

export async function updateCurrency(id, payload) {
  return axios.patch(`${API_BASE}/currencies/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteCurrency(id) {
  return axios.delete(`${API_BASE}/currencies/${id}`, {
    headers: authHeaders(),
  });
}
