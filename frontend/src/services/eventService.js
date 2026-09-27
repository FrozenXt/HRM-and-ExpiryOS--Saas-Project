import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

export async function getEvents(payload) {
  return axios.post(`${API_BASE}/events/list`, payload, {
    headers: authHeader(),
  });
}

export async function getEvent(id) {
  return axios.get(`${API_BASE}/events/${id}`, { headers: authHeader() });
}

export async function createEvent(payload) {
  return axios.post(`${API_BASE}/events`, payload, { headers: authHeader() });
}

export async function updateEvent(id, payload) {
  return axios.patch(`${API_BASE}/events/${id}`, payload, {
    headers: authHeader(),
  });
}

export async function deleteEvent(id) {
  return axios.delete(`${API_BASE}/events/${id}`, { headers: authHeader() });
}
