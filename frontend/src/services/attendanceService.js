import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";
export const getDayStatus = () =>
  axios.get(`${API_BASE}/attendance/day-status`, h());

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const h = () => ({ headers: authHeaders() });

export const getAttendance = ({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "date",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/attendance/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

// Manual entry (admin / hr)
export const createAttendance = (payload) =>
  axios.post(`${API_BASE}/attendance`, payload, h());

export const updateAttendance = (id, payload) =>
  axios.patch(`${API_BASE}/attendance/${id}`, payload, h());

export const deleteAttendance = (id) =>
  axios.delete(`${API_BASE}/attendance/${id}`, h());

// Self check-in / check-out. location = { latitude, longitude }
export const checkIn = (location) =>
  axios.post(`${API_BASE}/attendance/check-in`, { location }, h());

export const checkOut = (location) =>
  axios.post(`${API_BASE}/attendance/check-out`, { location }, h());

// The logged-in user's own employee profile (needed to find "today's record")
export const getMyEmployee = () => axios.get(`${API_BASE}/employees/me`, h());

export async function getAttendanceForPeriod(employeeId, startDate, endDate) {
  const fields = [
    { field: "employeeId", operator: "eq", value: employeeId },
    { field: "date", operator: "gte", value: startDate },
    { field: "date", operator: "lte", value: endDate },
  ];
  const res = await getAttendance({
    limit: 100,
    sort: "ASC",
    sort_field: "date",
    fields,
  });
  return res.data.data.data;
}
