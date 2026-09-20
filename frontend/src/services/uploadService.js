import axios from "axios";

const ORIGIN = "http://localhost:5000";
const API_BASE = `${ORIGIN}/api/v1`;

// Turns "/uploads/logos/x.png" into a full URL the <img> can load.
export const assetUrl = (path) =>
  !path ? "" : /^https?:\/\//.test(path) ? path : `${ORIGIN}${path}`;

export async function uploadLogo(file) {
  const body = new FormData();
  body.append("logo", file);

  const res = await axios.post(`${API_BASE}/uploads/logo`, body, {
    headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
  });
  return res.data.data.url; // stored path, e.g. /uploads/logos/abc.png
}
