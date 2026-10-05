import axios from "axios";
const API_BASE = "http://localhost:5000/api/v1";
const h = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  },
});

export const getOnboardingTasks = ({
  page = 1,
  limit = 20,
  sort = "ASC",
  sort_field = "dueDate",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/onboarding-tasks/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const createOnboardingTask = (payload) =>
  axios.post(`${API_BASE}/onboarding-tasks`, payload, h());
export const updateOnboardingTask = (id, payload) =>
  axios.patch(`${API_BASE}/onboarding-tasks/${id}`, payload, h());
export const deleteOnboardingTask = (id) =>
  axios.delete(`${API_BASE}/onboarding-tasks/${id}`, h());
