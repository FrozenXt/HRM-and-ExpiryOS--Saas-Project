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

export async function uploadProfileImage(userId, file) {
  const formData = new FormData();
  formData.append("profileImage", file);

  const token = localStorage.getItem("accessToken");

  return axios.post(`${API_BASE}/users/${userId}/profile-image`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMyProfile() {
  return axios.get(`${API_BASE}/users/me`, { headers: authHeaders() });
}

export async function updateMyProfile(payload) {
  return axios.patch(`${API_BASE}/users/me`, payload, {
    headers: authHeaders(),
  });
}

export async function changeMyPassword(currentPassword, newPassword) {
  return axios.post(
    `${API_BASE}/users/me/password`,
    { currentPassword, newPassword },
    { headers: authHeaders() },
  );
}

// Own photo: uses /profile-image (any role), not /:id/profile-image (admin only)
export async function uploadMyProfileImage(file) {
  const formData = new FormData();
  formData.append("profileImage", file);
  const token = localStorage.getItem("accessToken");
  return axios.post(`${API_BASE}/users/profile-image`, formData, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
