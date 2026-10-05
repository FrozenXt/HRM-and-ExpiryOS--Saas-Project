import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";
const h = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
});

export const getNotifications = (params = {}) =>
  axios.get(`${API_BASE}/notifications`, { ...h(), params });
export const getUnreadCount = () =>
  axios.get(`${API_BASE}/notifications/unread-count`, h());
export const markNotificationRead = (id) =>
  axios.patch(`${API_BASE}/notifications/${id}/read`, {}, h());
export const markAllNotificationsRead = () =>
  axios.patch(`${API_BASE}/notifications/read-all`, {}, h());
