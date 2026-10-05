import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { getEmployee } from "../services/employeeService";
import { FILE_BASE } from "../config";
import "../styles/settings.css"; // still used for .settings-panel-card / .settings-grid / etc.

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const nameOf = (o) => o?.name || o?.title || o?.designationName || "-";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const readableLabel = (v = "") =>
  v
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const statusBadge = {
  draft: "warning",
  submitted: "plan-default",
  approved: "success",
  rejected: "plan-business",
  pending: "warning",
  released: "success",
  active: "success",
  inactive: "warning",
};

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "attendance", label: "Attendance" },
  { key: "timelogs", label: "Time Logs" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Salary & Payroll" },
  { key: "documents", label: "Documents" },
];

// Photo if there is one, otherwise the initials. Falls back to the initials
// if the image fails to load.
function DetailAvatar({ name, profileImage, size = 52 }) {
  const [failed, setFailed] = useState(false);

  if (profileImage && !failed) {
    return (
      <img
        src={`${FILE_BASE}${profileImage}`}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <span
      className="co-avatar"
      style={{
        width: size,
        height: size,
        fontSize: 18,
        background: "#3b82f6",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  );
}

// Inline, self-contained — deliberately not a CSS class, so this can't be
// broken by a stylesheet not being loaded/merged correctly.
function TabBar({ tabs, activeTab, onChange }) {
  const [hovered, setHovered] = useState(null);

  return (
    <nav
      style={{
        display: "flex",
        gap: 28,
        borderBottom: "1px solid var(--border)",
        marginBottom: 20,
        overflowX: "auto",
      }}
    >
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        const isHovered = hovered === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            onMouseEnter={() => setHovered(t.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              padding: "12px 2px",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${isActive ? "var(--blue)" : "transparent"}`,
              fontSize: 14,
              fontWeight: isActive ? 600 : 500,
              color: isActive
                ? "var(--blue)"
                : isHovered
                  ? "var(--text)"
                  : "var(--text-dim)",
              whiteSpace: "nowrap",
              cursor: "pointer",
              transition: "color 0.15s ease, border-color 0.15s ease",
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

const InfoRow = ({ label, value }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 3 }}>
      {label}
    </div>
    <div style={{ fontSize: 13.5 }}>{value ?? "-"}</div>
  </div>
);

const EmptyRow = ({ colSpan, children }) => (
  <tr>
    <td
      colSpan={colSpan}
      className="muted"
      style={{ textAlign: "center", padding: 24 }}
    >
      {children}
    </td>
  </tr>
);

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getEmployee(id);
        if (!cancelled) setEmployee(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const user = employee?.user;
  const name = fullName(user) || `Employee #${employee?.id_int ?? ""}`;
  const profileImage = employee?.profileImage || user?.profileImage || null;

  const attendanceRecords = employee?.attendance?.records || [];
  const timeLogRecords = employee?.timeLogs?.records || [];
  const leaveBalances = employee?.leaveBalances?.balances || [];
  const recentLeaveRequests = employee?.recentLeaveRequests || [];
  const recentPayrolls = employee?.recentPayrolls || [];
  const documents = employee?.documents || [];
  const structure = employee?.salaryStructure;

  const allowanceTotal = useMemo(
    () =>
      (structure?.allowances || []).reduce((n, a) => n + (a.amount || 0), 0),
    [structure],
  );
  const deductionTotal = useMemo(
    () =>
      (structure?.deductions || []).reduce((n, d) => n + (d.amount || 0), 0),
    [structure],
  );

  if (loading) {
    return (
      <div className="muted" style={{ padding: "24px 0" }}>
        Loading employee...
      </div>
    );
  }

  if (error) {
    return (
      <>
        <div className="breadcrumb">
          <span
            onClick={() => navigate("/employees")}
            style={{ cursor: "pointer" }}
          >
            Employees
          </span>
          <Icon name="chevronRight" size={12} />
          <span className="current">Error</span>
        </div>
        <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
      </>
    );
  }

  if (!employee) return null;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span
          onClick={() => navigate("/employees")}
          style={{ cursor: "pointer" }}
        >
          Employees
        </span>
        <Icon name="chevronRight" size={12} />
        <span className="current">{name}</span>
      </div>

      <div className="welcome-row">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <DetailAvatar name={name} profileImage={profileImage} />
          <div className="welcome-text">
            <h1>{name}</h1>
            <p>
              {nameOf(employee.designation)} · {nameOf(employee.department)}
              {employee.company ? ` · ${employee.company.legalName}` : ""}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span
            className={`badge ${statusBadge[employee.status] || "warning"}`}
          >
            {readableLabel(employee.status)}
          </span>
          <button className="btn" onClick={() => navigate("/employees")}>
            <Icon name="chevronLeft" size={14} /> Back to list
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Icon name="clock" size={22} />
          </div>
          <div>
            <div className="stat-label">Attendance Hours (this month)</div>
            <div className="stat-value">
              {employee.attendance?.totalHours ?? 0}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <Icon name="clock" size={22} />
          </div>
          <div>
            <div className="stat-label">
              Approved Time Log Hours (this month)
            </div>
            <div className="stat-value">
              {employee.timeLogs?.totalApprovedHours ?? 0}
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <Icon name="calendar" size={22} />
          </div>
          <div>
            <div className="stat-label">Leave Types Tracked</div>
            <div className="stat-value">{leaveBalances.length}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Icon name="dollar" size={22} />
          </div>
          <div>
            <div className="stat-label">Latest Net Pay</div>
            <div className="stat-value">
              {recentPayrolls[0] ? recentPayrolls[0].netPay : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Horizontal underline tab bar (inline-styled, no external CSS needed) ---------- */}
      <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="settings-panel-card">
        {/* ---------------- OVERVIEW ---------------- */}
        {activeTab === "overview" && (
          <>
            <h2 className="settings-panel-title">Profile</h2>
            <p className="settings-panel-desc">
              Personal and assignment details for this employee.
            </p>

            <div className="settings-grid">
              <InfoRow label="Full Name" value={name} />
              <InfoRow label="Work Email" value={user?.email} />
              <InfoRow label="Personal Email" value={employee.personalEmail} />
              <InfoRow label="Department" value={nameOf(employee.department)} />
              <InfoRow
                label="Designation"
                value={nameOf(employee.designation)}
              />
              <InfoRow
                label="Reporting Manager"
                value={
                  employee.reportingManager
                    ? fullName(employee.reportingManager.user) ||
                      `Employee #${employee.reportingManager.id_int ?? ""}`
                    : "None"
                }
              />
              <InfoRow
                label="Joining Date"
                value={formatDate(employee.joiningDate)}
              />
              <InfoRow
                label="Date of Birth"
                value={formatDate(employee.dateOfBirth)}
              />
            </div>

            <div className="settings-divider" />

            <h2 className="settings-panel-title" style={{ fontSize: 14 }}>
              Emergency Contact
            </h2>
            <div className="settings-grid">
              <InfoRow label="Name" value={employee.emergencyContact?.name} />
              <InfoRow label="Phone" value={employee.emergencyContact?.phone} />
              <InfoRow
                label="Relation"
                value={employee.emergencyContact?.relation}
              />
            </div>
          </>
        )}

        {/* ---------------- ATTENDANCE ---------------- */}
        {activeTab === "attendance" && (
          <>
            <h2 className="settings-panel-title">Attendance — This Month</h2>
            <p className="settings-panel-desc">
              Total logged hours:{" "}
              <strong>{employee.attendance?.totalHours ?? 0} hrs</strong> from{" "}
              {attendanceRecords.length} record(s).
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.length === 0 && (
                    <EmptyRow colSpan={4}>
                      No attendance records this month.
                    </EmptyRow>
                  )}
                  {attendanceRecords.map((a) => (
                    <tr key={a._id}>
                      <td>{formatDate(a.date)}</td>
                      <td>{formatDateTime(a.checkIn)}</td>
                      <td>{formatDateTime(a.checkOut)}</td>
                      <td>
                        <span
                          className={`badge ${statusBadge[a.status] || "warning"}`}
                        >
                          {readableLabel(a.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- TIME LOGS ---------------- */}
        {activeTab === "timelogs" && (
          <>
            <h2 className="settings-panel-title">Time Logs — This Month</h2>
            <p className="settings-panel-desc">
              Approved hours (worked + overtime):{" "}
              <strong>{employee.timeLogs?.totalApprovedHours ?? 0} hrs</strong>{" "}
              from {timeLogRecords.length} record(s), all statuses.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Hours Worked</th>
                    <th>Overtime</th>
                    <th>Task</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {timeLogRecords.length === 0 && (
                    <EmptyRow colSpan={5}>No time logs this month.</EmptyRow>
                  )}
                  {timeLogRecords.map((t) => (
                    <tr key={t._id}>
                      <td>{formatDate(t.date)}</td>
                      <td>{t.hoursWorked}</td>
                      <td>{t.overtimeHours || 0}</td>
                      <td
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={t.taskDescription}
                      >
                        {t.taskDescription || "-"}
                      </td>
                      <td>
                        <span
                          className={`badge ${statusBadge[t.status] || "warning"}`}
                        >
                          {readableLabel(t.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- LEAVE ---------------- */}
        {activeTab === "leave" && (
          <>
            <h2 className="settings-panel-title">
              Leave Balances — {employee.leaveBalances?.year}
            </h2>
            <div className="table-wrap" style={{ marginBottom: 24 }}>
              <table>
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Used</th>
                    <th>Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveBalances.length === 0 && (
                    <EmptyRow colSpan={3}>
                      No leave balances set up this year.
                    </EmptyRow>
                  )}
                  {leaveBalances.map((b) => (
                    <tr key={b._id}>
                      <td>
                        {nameOf(b.leaveTypeId) !== "-"
                          ? nameOf(b.leaveTypeId)
                          : "Leave Type"}
                      </td>
                      <td>{b.used}</td>
                      <td>{b.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="settings-panel-title">Recent Leave Requests</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaveRequests.length === 0 && (
                    <EmptyRow colSpan={4}>No leave requests yet.</EmptyRow>
                  )}
                  {recentLeaveRequests.map((r) => (
                    <tr key={r._id}>
                      <td>{formatDate(r.fromDate)}</td>
                      <td>{formatDate(r.toDate)}</td>
                      <td
                        style={{
                          maxWidth: 220,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={r.reason}
                      >
                        {r.reason || "-"}
                      </td>
                      <td>
                        <span
                          className={`badge ${statusBadge[r.status] || "warning"}`}
                        >
                          {readableLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- SALARY & PAYROLL ---------------- */}
        {activeTab === "payroll" && (
          <>
            <h2 className="settings-panel-title">Salary Structure</h2>
            {structure ? (
              <div className="settings-grid" style={{ marginBottom: 20 }}>
                <InfoRow
                  label="Wage Type"
                  value={readableLabel(structure.wageType)}
                />
                <InfoRow
                  label="Pay Frequency"
                  value={readableLabel(structure.payFrequency)}
                />
                <InfoRow label="Basic" value={structure.basic} />
                <InfoRow
                  label="Hourly Rate"
                  value={structure.hourlyRate || "-"}
                />
                <InfoRow
                  label="Daily Rate"
                  value={structure.dailyRate || "-"}
                />
                <InfoRow
                  label="Overtime Multiplier"
                  value={structure.overtimeRateMultiplier}
                />
                <InfoRow label="Total Allowances" value={allowanceTotal} />
                <InfoRow label="Total Deductions" value={deductionTotal} />
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: 20 }}>
                No salary structure set up for this employee yet.
              </p>
            )}

            <div className="settings-divider" />

            <h2 className="settings-panel-title">Recent Payroll Records</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Payable Days</th>
                    <th>Gross Pay</th>
                    <th>Overtime Pay</th>
                    <th>Deductions</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayrolls.length === 0 && (
                    <EmptyRow colSpan={7}>No payroll records yet.</EmptyRow>
                  )}
                  {recentPayrolls.map((p) => (
                    <tr key={p._id}>
                      <td>{p.period}</td>
                      <td>{p.payableDays}</td>
                      <td>{p.grossPay}</td>
                      <td>{p.overtimePay}</td>
                      <td>{p.deductions}</td>
                      <td>
                        <strong>{p.netPay}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${statusBadge[p.status] || "warning"}`}
                        >
                          {readableLabel(p.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ---------------- DOCUMENTS ---------------- */}
        {activeTab === "documents" && (
          <>
            <h2 className="settings-panel-title">Documents</h2>
            <p className="settings-panel-desc">
              Most recent 5 documents on file for this employee.
            </p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {documents.length === 0 && (
                    <EmptyRow colSpan={4}>No documents uploaded yet.</EmptyRow>
                  )}
                  {documents.map((d) => (
                    <tr key={d._id}>
                      <td>{d.name || d.fileName || "Document"}</td>
                      <td>{nameOf(d.documentTypeId)}</td>
                      <td>{formatDate(d.createdAt)}</td>
                      <td>
                        {d.fileUrl && (
                          <a
                            className="btn btn-sm"
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Icon name="eye" size={13} /> View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
