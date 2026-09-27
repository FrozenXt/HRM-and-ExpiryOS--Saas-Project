// src/services/uploadService.js
import axios from "axios";

const ORIGIN = "http://localhost:5000";
const API_BASE = `${ORIGIN}/api/v1`;

export const assetUrl = (path) =>
  !path ? "" : /^https?:\/\//.test(path) ? path : `${ORIGIN}${path}`;

export async function uploadLogo(file) {
  const body = new FormData();
  body.append("file", file); // ← matches .single("file")

  const res = await axios.post(`${API_BASE}/uploads/logo`, body, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  return res.data.data.url;
}

export async function uploadDocumentFile(file) {
  const body = new FormData();
  body.append("file", file); // ← matches .single("file")

  const res = await axios.post(`${API_BASE}/uploads/document`, body, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  return res.data.data.url; // ← return the string, see note below
}
