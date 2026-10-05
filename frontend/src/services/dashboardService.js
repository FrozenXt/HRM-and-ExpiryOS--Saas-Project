import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const getAdminDashboard = (companyId) =>
  axios.get(`${API_BASE}/dashboard/admin`, {
    headers: authHeaders(),
    params: companyId ? { companyId } : {},
  });

export const getStaffDashboard = ({ month, year, employeeId } = {}) =>
  axios.get(`${API_BASE}/dashboard/staff`, {
    headers: authHeaders(),
    params: {
      ...(month ? { month } : {}),
      ...(year ? { year } : {}),
      ...(employeeId ? { employeeId } : {}),
    },
  });
