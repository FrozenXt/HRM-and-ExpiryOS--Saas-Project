import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export const setEmployeePin = (employeeId, pin) =>
  axios.post(
    `${API_BASE}/attendance/pin`,
    { employeeId, pin },
    { headers: authHeaders() },
  );
