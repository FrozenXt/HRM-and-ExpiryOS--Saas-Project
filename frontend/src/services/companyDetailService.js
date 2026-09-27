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

// GET /companies/:id  (Super Admin only)
export const getCompanyById = (id) =>
  axios.get(`${API_BASE}/companies/${id}`, h()).then((res) => res.data.data);

// PATCH /companies/:id/verification  body { approved: boolean }
export const verifyCompany = (id, approved) =>
  axios
    .patch(`${API_BASE}/companies/${id}/verification`, { approved }, h())
    .then((res) => res.data.data);

// Rows + total of any list resource scoped to one company.
export async function listByCompany(resource, companyId, limit = 100) {
  const res = await axios.post(
    `${API_BASE}/${resource}/list`,
    {
      page: 1,
      limit,
      sort: "ASC",
      sort_field: "createdAt",
      fields: [{ field: "companyId", operator: "eq", value: companyId }],
    },
    h(),
  );
  const { data, pagination } = res.data.data;
  return { rows: data, total: pagination?.total ?? data.length };
}
