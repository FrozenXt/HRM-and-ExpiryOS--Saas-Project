import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const listAll = (path) =>
  axios
    .post(
      `${API_BASE}/${path}/list`,
      { page: 1, limit: 100, sort: "ASC", sort_field: "createdAt", fields: [] },
      { headers: authHeaders() },
    )
    .then((res) => res.data.data.data);

export const getPlans = () => listAll("plans");
export const getCurrencies = () => listAll("currencies");
