import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getJobPostings({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/job-postings/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function getJobPosting(id) {
  return axios.get(`${API_BASE}/job-postings/${id}`, {
    headers: authHeaders(),
  });
}

export async function createJobPosting(payload) {
  return axios.post(`${API_BASE}/job-postings`, payload, {
    headers: authHeaders(),
  });
}

export async function updateJobPosting(id, payload) {
  return axios.put(`${API_BASE}/job-postings/${id}`, payload, {
    headers: authHeaders(),
  });
}

export async function deleteJobPosting(id) {
  return axios.delete(`${API_BASE}/job-postings/${id}`, {
    headers: authHeaders(),
  });
}
