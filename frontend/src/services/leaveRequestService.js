import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const list = (
  resource,
  {
    page = 1,
    limit = 20,
    sort = "DESC",
    sort_field = "createdAt",
    fields = [],
  } = {},
) =>
  axios.post(
    `${API_BASE}/${resource}/list`,
    {
      page,
      limit,
      sort,
      sort_field,
      fields,
    },
    {
      headers: authHeaders(),
    },
  );

export const getLeaveRequests = (opts) => list("leave-requests", opts);

export const createLeaveRequest = (payload) =>
  axios.post(`${API_BASE}/leave-requests`, payload, {
    headers: authHeaders(),
  });

export const updateLeaveRequest = (id, payload) =>
  axios.put(`${API_BASE}/leave-requests/${id}`, payload, {
    headers: authHeaders(),
  });

export async function updateLeaveRequestStatus(id, status) {
  const approved = status === "approved";

  return axios.patch(
    `${API_BASE}/leave-requests/${id}/status`,
    { approved },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    },
  );
}

export const deleteLeaveRequest = (id) =>
  axios.delete(`${API_BASE}/leave-requests/${id}`, {
    headers: authHeaders(),
  });
