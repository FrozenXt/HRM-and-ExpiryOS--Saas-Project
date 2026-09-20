import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getUsers({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/users/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

// Only super_admin and admin users can create users (enforced server-side too).
export async function createUser(payload) {
  return axios.post(`${API_BASE}/users`, payload, {
    headers: authHeaders(),
  });
}

export async function updateUser(id, payload) {
  return axios.patch(`${API_BASE}/users/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteUser(id) {
  return axios.delete(`${API_BASE}/users/${id}`, {
    headers: authHeaders(),
  });
}
