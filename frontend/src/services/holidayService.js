import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getHolidays({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "date",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/holidays/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function getHoliday(id) {
  return axios.get(`${API_BASE}/holidays/${id}`, { headers: authHeaders() });
}

export async function createHoliday(payload) {
  return axios.post(`${API_BASE}/holidays`, payload, {
    headers: authHeaders(),
  });
}

export async function updateHoliday(id, payload) {
  return axios.put(`${API_BASE}/holidays/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteHoliday(id) {
  return axios.delete(`${API_BASE}/holidays/${id}`, {
    headers: authHeaders(),
  });
}
