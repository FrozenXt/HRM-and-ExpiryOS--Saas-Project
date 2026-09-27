import axios from "axios";
const API_BASE = "http://localhost:5000/api/v1";
const h = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  },
});

export const getLeaveTypes = ({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "name",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/leave-types/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const createLeaveType = (payload) =>
  axios.post(`${API_BASE}/leave-types`, payload, h());
export const updateLeaveType = (id, payload) =>
  axios.patch(`${API_BASE}/leave-types/${id}`, payload, h());
export const deleteLeaveType = (id) =>
  axios.delete(`${API_BASE}/leave-types/${id}`, h());
