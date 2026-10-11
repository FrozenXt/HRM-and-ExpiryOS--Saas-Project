import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";
const h = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
});

export const getBackups = (params = {}) =>
  axios.get(`${API_BASE}/backups`, { ...h(), params });
export const getBackupStatus = () =>
  axios.get(`${API_BASE}/backups/status`, h());
export const runBackup = (body = {}) =>
  axios.post(`${API_BASE}/backups`, body, h());
export const deleteBackup = (id) =>
  axios.delete(`${API_BASE}/backups/${id}`, h());
export const downloadBackup = (id) =>
  axios.get(`${API_BASE}/backups/${id}/download`, {
    ...h(),
    responseType: "blob",
  });
