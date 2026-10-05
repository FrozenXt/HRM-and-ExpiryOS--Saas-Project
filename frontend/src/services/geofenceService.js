// src/services/geofenceService.js
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

const list = (
  resource,
  {
    page = 1,
    limit = 20,
    sort = "DESC",
    sort_field = "createdAt",
    fields = [],
  } = {},
) =>
  axios.post(
    `${API_BASE}/${resource}/list`,
    { page, limit, sort, sort_field, fields },
    h(),
  );

export const getGeofenceZones = (opts) =>
  list("geofence-zones", { sort: "ASC", sort_field: "name", ...opts });

export const getGeofenceZone = (id) =>
  axios.get(`${API_BASE}/geofence-zones/${id}`, h());

export const createGeofenceZone = (payload) =>
  axios.post(`${API_BASE}/geofence-zones`, payload, h());

export const updateGeofenceZone = (id, payload) =>
  axios.patch(`${API_BASE}/geofence-zones/${id}`, payload, h());

export const deleteGeofenceZone = (id) =>
  axios.delete(`${API_BASE}/geofence-zones/${id}`, h());
