// src/components/ShiftAssignModal.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { isSuperAdmin } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { assignShift } from "../services/shiftService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

export default function ShiftAssignModal({ shift, shifts, onClose, onSaved }) {
  const superAdmin = isSuperAdmin();
  // A super admin only sees the employees of this shift's company.
  const scopeId = superAdmin ? idOf(shift.companyId) : undefined;

  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [checked, setChecked] = useState(new Set());
  const [initial, setInitial] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      listOptions("employees", scopeId),
      listOptions("users", scopeId),
    ])
      .then(([emps, us]) => {
        setEmployees(emps);
        setUsers(us);
        const mine = new Set(
          emps.filter((e) => idOf(e.shiftId) === shift._id).map((e) => e._id),
        );
        setChecked(new Set(mine));
        setInitial(mine);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u._id, u])),
    [users],
  );
  const shiftsById = useMemo(
    () => Object.fromEntries(shifts.map((s) => [s._id, s])),
    [shifts],
  );

  const nameOf = (emp) =>
    fullName(usersById[idOf(emp.userId)]) || `Employee #${emp.id_int ?? ""}`;

  const visible = employees.filter((e) =>
    nameOf(e).toLowerCase().includes(search.toLowerCase()),
  );

  const toggle = (id) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleSave = async () => {
    const toAdd = [...checked].filter((id) => !initial.has(id));
    const toRemove = [...initial].filter((id) => !checked.has(id));
    if (!toAdd.length && !toRemove.length) {
      onClose();
      return;
    }

    try {
      setSaving(true);
      setError("");
      const results = await Promise.allSettled([
        ...toAdd.map((id) => assignShift(id, shift._id)),
        ...toRemove.map((id) => assignShift(id, null)),
      ]);
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length) {
        const msg =
          failed[0].reason?.response?.data?.message ||
          failed[0].reason?.message;
        setError(`${failed.length} change(s) failed: ${msg}`);
        onSaved(); // refresh counts for the ones that did save
        return;
      }
      onSaved();
      onClose();
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
          width: 520,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="users" size={16} /> Assign employees to {shift.name}
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

        <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
          {shift.startTime} – {shift.endTime}. Ticked employees follow this
          shift; unticking puts an employee back on company hours.
        </div>

        <div className="search-box" style={{ marginBottom: 10 }}>
          <Icon name="search" size={16} />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "16px 0" }}>
            Loading employees...
          </div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: 12 }}>
            {visible.length === 0 && (
              <div className="muted" style={{ padding: "12px 0" }}>
                No employees found.
              </div>
            )}
            {visible.map((emp) => {
              const other = shiftsById[idOf(emp.shiftId)];
              const onOther = other && other._id !== shift._id;
              return (
                <label
                  key={emp._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 4px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(emp._id)}
                    onChange={() => toggle(emp._id)}
                  />
                  <span style={{ flex: 1 }}>{nameOf(emp)}</span>
                  {onOther && (
                    <span className="muted" style={{ fontSize: 12 }}>
                      now: {other.name}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        {error && (
          <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={saving || loading}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Assignments"}
          </button>
        </div>
      </div>
    </div>
  );
}
