import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getPerformanceReviews({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "reviewPeriod",
  fields = [],
} = {}) {
  return axios.post(
    `${API_BASE}/performance-reviews/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function getPerformanceReview(id) {
  return axios.get(`${API_BASE}/performance-reviews/${id}`, {
    headers: authHeaders(),
  });
}

export async function createPerformanceReview(payload) {
  return axios.post(`${API_BASE}/performance-reviews`, payload, {
    headers: authHeaders(),
  });
}

export async function updatePerformanceReview(id, payload) {
  return axios.patch(`${API_BASE}/performance-reviews/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deletePerformanceReview(id) {
  return axios.delete(`${API_BASE}/performance-reviews/${id}`, {
    headers: authHeaders(),
  });
}
