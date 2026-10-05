import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const getMonitoringPolicy = (companyId) =>
  axios.get(`${API_BASE}/monitoring-policy`, {
    headers: authHeaders(),
    params: companyId ? { companyId } : {},
  });

export const updateMonitoringPolicy = (payload) =>
  axios.put(`${API_BASE}/monitoring-policy`, payload, {
    headers: authHeaders(),
  });
