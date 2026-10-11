import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";
const h = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
});
const clean = (o) =>
  Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== "" && v != null),
  );

export const getEmployeeReport = (filters) =>
  axios.get(`${API_BASE}/reports/employees/summary`, {
    ...h(),
    params: clean(filters),
  });

export const getEmployeeDirectory = (filters, extra = {}) =>
  axios.get(`${API_BASE}/reports/employees/directory`, {
    ...h(),
    params: clean({ ...filters, ...extra }),
  });

export const getCompanyReport = (filters) =>
  api.get("/reports/companies/summary", { params: filters });

export const getCompanyDirectory = (filters, opts) =>
  api.get("/reports/companies/directory", { params: { ...filters, ...opts } });

export const exportCompanyReport = (filters) =>
  api.get("/reports/companies/export", {
    params: filters,
    responseType: "blob",
  });

export const exportEmployeeReport = (filters) =>
  axios.get(`${API_BASE}/reports/employees/export`, {
    ...h(),
    responseType: "blob",
    params: clean(filters),
  });
