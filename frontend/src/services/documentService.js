import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const h = () => ({ headers: authHeaders() });

export const getDocuments = ({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/documents/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const getDocument = (id) =>
  axios.get(`${API_BASE}/documents/${id}`, h());

// employeeId is ignored server-side for staff — always uploads against
// their own employeeId regardless of what's sent.
export const uploadDocument = (payload) =>
  axios.post(`${API_BASE}/documents`, payload, h());

export const deleteDocument = (id) =>
  axios.delete(`${API_BASE}/documents/${id}`, h());

// New version of an existing document — this is the "edit" action.
export const reuploadDocument = (id, payload) =>
  axios.post(`${API_BASE}/documents/${id}/reupload`, payload, h());
