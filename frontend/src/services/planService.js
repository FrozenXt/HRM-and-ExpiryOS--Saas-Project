import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getPlans({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "monthlyPrice",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/plans/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

export async function createPlan({
  name,
  employeeLimit,
  features,
  monthlyPrice,
  isActive,
}) {
  return axios.post(
    `${API_BASE}/plans`,
    { name, employeeLimit, features, monthlyPrice, isActive },
    { headers: authHeaders() },
  );
}
