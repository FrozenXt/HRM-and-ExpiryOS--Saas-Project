import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Super Admin — paginated list across all companies.
export async function getSubscriptions({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "createdAt",
  fields = [],
}) {
  return axios.post(
    `${API_BASE}/subscriptions/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );
}

// Company Admin — their own company's subscription.
export async function getMySubscription() {
  return axios.get(`${API_BASE}/subscriptions/me`, { headers: authHeaders() });
}

// Company Admin — subscribe to / change plan. Only planId + billingCycle are
// ever sent; price and employee count are computed server-side.
export async function subscribeToPlan({ planId, billingCycle }) {
  return axios.post(
    `${API_BASE}/subscriptions/subscribe`,
    { planId, billingCycle },
    { headers: authHeaders() },
  );
}

// Super Admin — manual override (Enterprise custom pricing, status fixes).
export async function updateSubscription(id, payload) {
  return axios.put(`${API_BASE}/subscriptions/${id}`, payload, {
    headers: authHeaders(),
  });
}
