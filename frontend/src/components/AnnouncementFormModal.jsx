import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Field, inputStyle } from "./FormParts";
import {
  createAnnouncement,
  updateAnnouncement,
} from "../services/announcementService";
import { listOptions } from "../services/employeeService";

const idOf = (v) => v?._id || v || "";

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "department", label: "Specific Department" },
  { value: "role", label: "Specific Role" },
];

export default function AnnouncementFormModal({
  mode = "create",
  announcement,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => {
    if (isEdit && announcement) {
      return {
        title: announcement.title || "",
        message: announcement.message || "",
        audience: announcement.audience || "all",
        departmentId: idOf(announcement.departmentId),
        attachmentUrl: announcement.attachmentUrl || "",
      };
    }
    return {
      title: "",
      message: "",
      audience: "all",
      departmentId: "",
      attachmentUrl: "",
    };
  });

  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (form.audience !== "department") return;
    let cancelled = false;
    setLoadingDepartments(true);
    listOptions("departments")
      .then((data) => !cancelled && setDepartments(data))
      .catch(
        (err) =>
          !cancelled && setError(err.response?.data?.message || err.message),
      )
      .finally(() => !cancelled && setLoadingDepartments(false));
    return () => {
      cancelled = true;
    };
  }, [form.audience]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.message.trim()) {
      setError("Title and message are required.");
      return;
    }
    if (form.audience === "department" && !form.departmentId) {
      setError("Pick a department for this audience.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      message: form.message.trim(),
      audience: form.audience,
      departmentId: form.audience === "department" ? form.departmentId : null,
      attachmentUrl: form.attachmentUrl.trim() || null,
    };

    try {
      setSubmitting(true);
      const res = isEdit
        ? await updateAnnouncement(announcement._id, payload)
        : await createAnnouncement(payload);
      onSaved?.(res.data.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 620,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="bell" size={16} />{" "}
            {isEdit ? "Edit Announcement" : "New Announcement"}
          </h2>
          <button
            type="button"
            className="more-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon
              name="chevronRight"
              size={16}
              style={{ transform: "rotate(45deg)" }}
            />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Announcement" first />

          <Field label="Title *">
            <input
              type="text"
              className="search-box"
              style={inputStyle}
              value={form.title}
              onChange={set("title")}
              placeholder="e.g. Office closed on Monday"
            />
          </Field>

          <Field label="Message *">
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              value={form.message}
              onChange={set("message")}
              placeholder="Write the announcement..."
            />
          </Field>

          <Field label="Audience *">
            <select
              className="search-box"
              style={inputStyle}
              value={form.audience}
              onChange={set("audience")}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          {form.audience === "department" && (
            <Field label="Department *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.departmentId}
                onChange={set("departmentId")}
              >
                <option value="">
                  {loadingDepartments ? "Loading..." : "Select department"}
                </option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {form.audience === "role" && (
            <p
              className="muted"
              style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
            >
              Role-based announcements are resolved server-side from the
              logged-in user's role.
            </p>
          )}

          <Field
            label="Attachment URL"
            hint="Optional link to a document or resource."
          >
            <input
              type="text"
              className="search-box"
              style={inputStyle}
              value={form.attachmentUrl}
              onChange={set("attachmentUrl")}
              placeholder="/uploads/… or https://…"
            />
          </Field>

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 14 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 12,
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting ? "Saving..." : isEdit ? "Update" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
