// src/pages/Shifts.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import ShiftFormModal from "../components/ShiftFormModal";
import ShiftAssignModal from "../components/ShiftAssignModal";
import { listOptions } from "../services/employeeService";
import { getShifts, deleteShift } from "../services/shiftService";
import { isOvernight, lengthMinutes, hm } from "../utils/shiftFormat";

const idOf = (v) => v?._id || v || "";

export default function Shifts() {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError("");
      const [shiftRes, emps] = await Promise.all([
        getShifts(),
        listOptions("employees").catch(() => []),
      ]);
      setShifts(shiftRes.data.data.data);
      setEmployees(emps);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // employees per shift (only counts employees whose shift still exists)
  const countByShift = useMemo(() => {
    const counts = {};
    employees.forEach((e) => {
      const sid = idOf(e.shiftId);
      if (sid) counts[sid] = (counts[sid] || 0) + 1;
    });
    return counts;
  }, [employees]);

  const shiftIds = new Set(shifts.map((s) => s._id));
  const onShift = employees.filter((e) => shiftIds.has(idOf(e.shiftId))).length;

  const filtered = shifts.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (s) => {
    const n = countByShift[s._id] || 0;
    const warn = n
      ? `\n\n${n} employee(s) are on this shift and will go back to company hours.`
      : "";
    if (!window.confirm(`Delete the "${s.name}" shift?${warn}`)) return;
    try {
      await deleteShift(s._id);
      fetchAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (s) => {
    setSelected(s);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Shifts</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Shifts</h1>
          <p>
            Define work shifts and assign employees. Late marking, half days and
            auto check-out use each employee's own shift; anyone without one
            follows the company working hours.
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          Add Shift
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="clock"
          label="Total Shifts"
          value={shifts.length}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Active Shifts"
          value={shifts.filter((s) => s.isActive !== false).length}
        />
        <StatCard
          tone="purple"
          icon="users"
          label="Employees on a shift"
          value={onShift}
        />
        <StatCard
          tone="orange"
          icon="building"
          label="On company hours"
          value={Math.max(0, employees.length - onShift)}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>All Shifts</h2>
            <p>Shifts that cross midnight are marked Overnight.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search shifts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading shifts...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Shift</th>
                  <th>Timing</th>
                  <th>Length</th>
                  <th>Break</th>
                  <th>Late grace</th>
                  <th>Employees</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="muted"
                      style={{ textAlign: "center", padding: 28 }}
                    >
                      No shifts yet. Click "Add Shift" to create one.
                    </td>
                  </tr>
                )}
                {filtered.map((s, i) => {
                  const total = lengthMinutes(s.startTime, s.endTime);
                  return (
                    <tr key={s._id}>
                      <td>{s.id_int ?? i + 1}</td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: s.color || "#3b82f6",
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontWeight: 500 }}>{s.name}</span>
                        </div>
                      </td>
                      <td>
                        {s.startTime} – {s.endTime}
                        {isOvernight(s.startTime, s.endTime) && (
                          <span
                            className="badge warning"
                            style={{ marginLeft: 8 }}
                          >
                            Overnight
                          </span>
                        )}
                      </td>
                      <td>{hm(total)}</td>
                      <td>{s.breakMinutes ? `${s.breakMinutes} min` : "-"}</td>
                      <td>
                        {s.graceMinutes === null || s.graceMinutes === undefined
                          ? "Company default"
                          : `${s.graceMinutes} min`}
                      </td>
                      <td>{countByShift[s._id] || 0}</td>
                      <td>
                        <span
                          className={`badge ${s.isActive === false ? "warning" : "success"}`}
                        >
                          {s.isActive === false ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => setAssigning(s)}
                          >
                            <Icon name="users" size={13} /> Assign
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(s)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(s)}
                          >
                            <Icon name="trash" size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalMode && (
        <ShiftFormModal
          mode={modalMode}
          shift={selected}
          onClose={closeModal}
          onSaved={fetchAll}
        />
      )}

      {assigning && (
        <ShiftAssignModal
          shift={assigning}
          shifts={shifts}
          onClose={() => setAssigning(null)}
          onSaved={fetchAll}
        />
      )}
    </>
  );
}
