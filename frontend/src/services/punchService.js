// services/punch.service.js
import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Public kiosk punch — no JWT. employeeId + PIN identify the employee.
// type: "in" | "out"
export const punch = ({ employeeId, pin, type, deviceId, location }) =>
  axios.post(
    `${API_BASE}/punch`,
    { employeeId, pin, type, deviceId, location },
    { headers: { "Content-Type": "application/json" } },
  );

// Admin/HR — recent punches for the whole company.
export const getRecentPunches = ({ limit = 50, since } = {}) =>
  axios.get(`${API_BASE}/punch/recent`, {
    headers: authHeaders(),
    params: { limit, since },
  });

// Admin/HR (any employee) or staff (own only) — punch history.
export const getEmployeePunchHistory = (
  employeeId,
  { limit = 100, since } = {},
) =>
  axios.get(`${API_BASE}/punch/employee/${employeeId}`, {
    headers: authHeaders(),
    params: { limit, since },
  });

// HR/Admin — set or reset an employee's 4-digit kiosk PIN.
export const setEmployeePin = (employeeId, pin) =>
  axios.post(
    `${API_BASE}/attendance/pin`,
    { employeeId, pin },
    { headers: authHeaders() },
  );
