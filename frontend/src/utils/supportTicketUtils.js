// src/utils/supportTicketUtils.js
export const label = (v = "") =>
  v
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const timeAgo = (d) => {
  if (!d) return "-";
  const mins = Math.max(0, Math.round((Date.now() - new Date(d)) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 30 ? `${days}d ago` : formatDate(d);
};

export const STATUS_BADGE = {
  open: "warning",
  in_progress: "plan-default",
  waiting_on_requester: "plan-default",
  resolved: "success",
  closed: "success",
};

export const PRIORITY_STYLE = {
  urgent: { color: "var(--red)", fontWeight: 600 },
  high: { color: "var(--orange, #f97316)", fontWeight: 600 },
};

export const MAX_FILES = 5;
export const MAX_FILE_MB = 5;

// Returns an error message, or "" if the selection is fine.
export const checkFiles = (files) => {
  if (files.length > MAX_FILES)
    return `You can attach up to ${MAX_FILES} files.`;
  const big = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
  return big ? `"${big.name}" is larger than ${MAX_FILE_MB} MB.` : "";
};
