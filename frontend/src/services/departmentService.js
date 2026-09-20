import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getDepartments({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "name",
  fields = [],
} = {}) {
  return axios.post(
    `${API_BASE}/departments/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function getDepartmentById(id) {
  return axios.get(`${API_BASE}/departments/${id}`, {
    headers: authHeaders(),
  });
}

export async function createDepartment(payload) {
  return axios.post(`${API_BASE}/departments`, payload, {
    headers: authHeaders(),
  });
}

export async function updateDepartment(id, payload) {
  return axios.put(`${API_BASE}/departments/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteDepartment(id) {
  return axios.delete(`${API_BASE}/departments/${id}`, {
    headers: authHeaders(),
  });
}
