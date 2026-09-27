import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export async function getAnnouncements(payload) {
  return axios.post(`${API_BASE}/announcements/list`, payload, {
    headers: authHeader(),
  });
}

export async function getMyAnnouncementFeed(payload = {}) {
  return axios.post(`${API_BASE}/announcements/my-feed`, payload, {
    headers: authHeader(),
  });
}

export async function getAnnouncement(id) {
  return axios.get(`${API_BASE}/announcements/${id}`, {
    headers: authHeader(),
  });
}

export async function createAnnouncement(payload) {
  return axios.post(`${API_BASE}/announcements`, payload, {
    headers: authHeader(),
  });
}

export async function updateAnnouncement(id, payload) {
  return axios.patch(`${API_BASE}/announcements/${id}`, payload, {
    headers: authHeader(),
  });
}

export async function deleteAnnouncement(id) {
  return axios.delete(`${API_BASE}/announcements/${id}`, {
    headers: authHeader(),
  });
}
