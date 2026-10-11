// src/services/supportTicketService.js
//
// Four calls cover the whole feature:
//   list    -> table rows + pagination + summary counts (no separate stats call)
//   options -> dropdown data, assignees, whether this user can create (once)
//   get     -> one ticket with replies, attachments and history (on open)
//   create / comment / update / delete -> actions
import axios from "axios";

const API_BASE = "http://localhost:5000/api/v1";

function authHeaders() {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// For multipart bodies the browser must set Content-Type itself (it adds the
// boundary), so only the token goes here.
function bearerOnly() {
  return { Authorization: `Bearer ${localStorage.getItem("accessToken")}` };
}

export const getSupportTickets = ({
  page = 1,
  limit = 20,
  sort = "DESC",
  sort_field = "lastActivityAt",
  fields = [],
} = {}) =>
  axios.post(
    `${API_BASE}/support-tickets/list`,
    { page, limit, sort, sort_field, fields },
    { headers: authHeaders() },
  );

export const getTicketOptions = () =>
  axios.get(`${API_BASE}/support-tickets/options`, { headers: authHeaders() });

export const getSupportTicket = (id) =>
  axios.get(`${API_BASE}/support-tickets/${id}`, { headers: authHeaders() });

// Build multipart form data; empty values are left out.
const toFormData = (values, files = []) => {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => {
    if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
  });
  files.forEach((f) => fd.append("attachments", f));
  return fd;
};

// { subject, description, category, priority } + up to 5 files.
export const createSupportTicket = (values, files = []) =>
  axios.post(`${API_BASE}/support-tickets`, toFormData(values, files), {
    headers: bearerOnly(),
  });

// { message, isInternal } + files. Either a message or a file is required.
export const addTicketComment = (id, values, files = []) =>
  axios.post(
    `${API_BASE}/support-tickets/${id}/comments`,
    toFormData(values, files),
    { headers: bearerOnly() },
  );

// ASSUMPTION: PUT body takes any of { status, priority, assigneeId }.
// Close / reopen are sent as a status change. I haven't seen the PUT schema;
// if it differs, this is the one function to change.
export const updateSupportTicket = (id, payload) =>
  axios.put(`${API_BASE}/support-tickets/${id}`, payload, {
    headers: authHeaders(),
  });

export const deleteSupportTicket = (id) =>
  axios.delete(`${API_BASE}/support-tickets/${id}`, { headers: authHeaders() });
