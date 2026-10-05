// src/services/shiftService.js
import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const getShifts = ({
  page = 1,
  limit = 100,
  sort = "ASC",
  sort_field = "startTime",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/shifts/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );

export const createShift = (payload) =>
  axios.post(`${API_BASE}/shifts`, payload, { headers: authHeaders() });

export const updateShift = (id, payload) =>
  axios.patch(`${API_BASE}/shifts/${id}`, payload, { headers: authHeaders() });

export const deleteShift = (id) =>
  axios.delete(`${API_BASE}/shifts/${id}`, { headers: authHeaders() });

export const assignShift = (employeeId, shiftId) =>
  axios.patch(
    `${API_BASE}/employees/${employeeId}`,
    { shiftId },
    { headers: authHeaders() },
  );
