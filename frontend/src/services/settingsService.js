// src/services/settingsService.js
import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getCompanySettings(companyId) {
  return axios.get(`${API_BASE}/company-settings`, {
    headers: authHeaders(),
    params: companyId ? { companyId } : {},
  });
}

export async function updateCompanySettings(payload) {
  return axios.put(`${API_BASE}/company-settings`, payload, {
    headers: authHeaders(),
  });
}
