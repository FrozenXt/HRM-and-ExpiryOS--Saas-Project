// src/services/deviceSessionService.js
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

export const getDeviceSessions = ({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "sessionStart",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/device-sessions/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const getDeviceSession = (id) =>
  axios.get(`${API_BASE}/device-sessions/${id}`, h());

// employeeId/companyId come from the token server-side — never sent from here.
export const startDeviceSession = (payload) =>
  axios.post(`${API_BASE}/device-sessions`, payload, h());

export const updateDeviceSession = (id, payload) =>
  axios.patch(`${API_BASE}/device-sessions/${id}`, payload, h());

export const endDeviceSession = (id) =>
  updateDeviceSession(id, { sessionEnd: new Date().toISOString() });

export const deleteDeviceSession = (id) =>
  axios.delete(`${API_BASE}/device-sessions/${id}`, h());
