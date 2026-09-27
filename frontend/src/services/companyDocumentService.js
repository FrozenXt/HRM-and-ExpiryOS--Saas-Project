import axios from "axios";

const ORIGIN = "http://localhost:5000";
const API_BASE = `${ORIGIN}/api/v1`;

const h = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  },
});

export const assetUrl = (path) =>
  !path ? "" : /^https?:\/\//.test(path) ? path : `${ORIGIN}${path}`;

export const getCompanyDocuments = ({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/company-documents/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const createCompanyDocument = (payload) =>
  axios.post(`${API_BASE}/company-documents`, payload, h());

export const replaceCompanyDocument = (id, payload) =>
  axios.put(`${API_BASE}/company-documents/${id}`, payload, h());

export const deleteCompanyDocument = (id) =>
  axios.delete(`${API_BASE}/company-documents/${id}`, h());

// { approved: boolean, note?: string } — adjust if your review body differs
export const reviewCompanyDocument = (id, payload) =>
  axios.put(`${API_BASE}/company-documents/${id}/review`, payload, h());

// Uploads the raw file, returns { url, fileName, mimeType, sizeBytes }
export async function uploadDocumentFile(file) {
  const body = new FormData();
  body.append("file", file);
  const res = await axios.post(`${API_BASE}/uploads/document`, body, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  return res.data.data;
}
