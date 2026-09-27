import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getTimeLogs({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "date",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/time-logs/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function getTimeLog(id) {
  return axios.get(`${API_BASE}/time-logs/${id}`, { headers: authHeaders() });
}

export async function createTimeLog(payload) {
  return axios.post(`${API_BASE}/time-logs`, payload, {
    headers: authHeaders(),
  });
}

export async function updateTimeLog(id, payload) {
  return axios.put(`${API_BASE}/time-logs/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteTimeLog(id) {
  return axios.delete(`${API_BASE}/time-logs/${id}`, {
    headers: authHeaders(),
  });
}

export async function submitTimeLog(id) {
  return axios.post(
    `${API_BASE}/time-logs/${id}/submit`,
    {},
    { headers: authHeaders() },
  );
}

// Assumption: same { approved: boolean } shape as leave-requests' setStatus —
// confirm against your time-log.controller.js if this 400s.
export async function reviewTimeLog(id, status) {
  // status must be exactly "approved" or "rejected"
  return axios.put(
    `${API_BASE}/time-logs/${id}/review`,
    { status },
    { headers: authHeaders() },
  );
}
