import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle, labelStyle } from "./FormParts";
import {
  createOnboardingTask,
  updateOnboardingTask,
} from "../services/onboardingTaskService";
import { listOptions } from "../services/employeeService";
import { isSuperAdmin } from "../utils/auth";

export const CATEGORIES = [
  { value: "documentation", label: "Documentation" },
  { value: "it_setup", label: "IT Setup" },
  { value: "training", label: "Training" },
  { value: "hr_formalities", label: "HR Formalities" },
  { value: "other", label: "Other" },
];
export const STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

export default function OnboardingTaskModal({
  mode = "create",
  task = null,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!task;
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState({
    companyId: isEdit ? idOf(task.companyId) : "",
    employeeId: isEdit ? idOf(task.employeeId) : "",
    taskName: isEdit ? task.taskName || "" : "",
    category: isEdit ? task.category || "documentation" : "documentation",
    assignedTo: isEdit ? idOf(task.assignedTo) : "",
    dueDate: isEdit ? task.dueDate?.slice(0, 10) || "" : "",
    status: isEdit ? task.status || "pending" : "pending",
  });
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
  }, [superAdmin]);

  // Admin/HR: their own company is scoped by the backend. Super admin: chosen company.
  const ready = superAdmin ? !!form.companyId : true;
  useEffect(() => {
    if (!ready) {
      setEmployees([]);
      setUsers([]);
      return;
    }
    const scope = superAdmin ? form.companyId : undefined;
    Promise.all([listOptions("employees", scope), listOptions("users", scope)])
      .then(([e, u]) => {
        setEmployees(e || []);
        setUsers(u || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [ready, superAdmin, form.companyId]);

  const usersById = Object.fromEntries(users.map((u) => [u._id, u]));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const onCompanyChange = (e) =>
    setForm((f) => ({
      ...f,
      companyId: e.target.value,
      employeeId: "",
      assignedTo: "",
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (superAdmin && !form.companyId)
      return setError("Please select a company.");
    if (!form.employeeId) return setError("Please select an employee.");
    if (!form.taskName.trim()) return setError("Task name is required.");
    if (!form.dueDate) return setError("Due date is required.");

    const payload = {
      employeeId: form.employeeId,
      taskName: form.taskName.trim(),
      category: form.category,
      assignedTo: form.assignedTo || null,
      dueDate: form.dueDate,
      status: form.status,
    };
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSaving(true);
      if (isEdit) await updateOnboardingTask(task._id, payload);
      else await createOnboardingTask(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to save task",
      );
    } finally {
      setSaving(false);
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
          width: 540,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="list" size={16} />{" "}
            {isEdit ? "Edit Task" : "Add Onboarding Task"}
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
          {superAdmin && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Company *</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.companyId}
                onChange={onCompanyChange}
                disabled={isEdit}
              >
                <option value="">Select a company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.legalName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Employee *</label>
            <select
              className="search-box"
              style={inputStyle}
              value={form.employeeId}
              onChange={set("employeeId")}
              disabled={isEdit || !ready}
            >
              <option value="">
                {ready ? "Select employee" : "Select a company first"}
              </option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {fullName(usersById[idOf(emp.userId)]) ||
                    `Employee #${emp.id_int ?? ""}`}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Task Name *</label>
            <input
              className="search-box"
              style={inputStyle}
              value={form.taskName}
              onChange={set("taskName")}
              placeholder="e.g. Set up laptop and email account"
              autoFocus
            />
          </div>

          <Row>
            <Field label="Category">
              <select
                className="search-box"
                style={inputStyle}
                value={form.category}
                onChange={set("category")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.dueDate}
                onChange={set("dueDate")}
              />
            </Field>
          </Row>

          <Row>
            <Field label="Assigned To">
              <select
                className="search-box"
                style={inputStyle}
                value={form.assignedTo}
                onChange={set("assignedTo")}
                disabled={!ready}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {fullName(u)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className="search-box"
                style={inputStyle}
                value={form.status}
                onChange={set("status")}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 8,
              paddingTop: 16,
              borderTop: "1px solid var(--border)",
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn primary">
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
