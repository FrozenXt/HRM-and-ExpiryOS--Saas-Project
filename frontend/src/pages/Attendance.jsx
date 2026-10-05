import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import AttendanceFormModal from "../components/AttendanceFormModal";
import { useGeolocation } from "../hooks/useGeolocation";
import { FILE_BASE } from "../config";
import { getCurrentUser } from "../utils/auth";
import {
  getAttendance,
  deleteAttendance,
  checkIn,
  checkOut,
  getMyEmployee,
  getDayStatus,
} from "../services/attendanceService";

const AVATAR_COLORS = [
  "#3b82f6",
  "#10b981",
  "#0ea5e9",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#22c55e",
  "#64748b",
  "#7c3aed",
  "#06b6d4",
];

const pad = (n) => String(n).padStart(2, "0");

// Local calendar date <-> "YYYY-MM-DD" key (matches the <input type="date"> value).
const toKey = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const startOfDayFromKey = (key) => fromKey(key);
const endOfDayFromKey = (key) => {
  const d = fromKey(key);
  d.setHours(23, 59, 59, 999);
  return d;
};
const addDays = (key, n) => {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const fmtKeyLong = (key) =>
  fromKey(key).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "-";
const sameDay = (a, b) =>
  new Date(a).toDateString() === new Date(b).toDateString();

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const hoursBetween = (a, b) => {
  if (!a || !b) return "-";
  const mins = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

const STATUS_BADGE = {
  present: { cls: "success", label: "Present" },
  late: { cls: "plan-default", label: "Late" },
  half_day: { cls: "plan-business", label: "Half day" },
  absent: { cls: "warning", label: "Absent" },
};

const DATE_PRESETS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Pick a date / range" },
  { value: "all", label: "All dates" },
];

const mapLink = (loc) =>
  loc?.latitude != null
    ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
    : null;

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Photo if there is one, otherwise coloured initials. Falls back to the
// initials if the image fails to load.
function PersonAvatar({ name, profileImage, color, size = 34 }) {
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
      style={{ background: color, borderRadius: "50%" }}
    >
      {initials(name)}
    </span>
  );
}

export default function Attendance() {
  const me = getCurrentUser();
  const role = me?.role;
  const isStaff = role === "staff";
  const canManage = role === "admin" || role === "hr" || role === "super_admin";
  const canCheckIn = role !== "super_admin"; // super admins have no employee profile

  const now = useClock();
  const { permission, getPosition } = useGeolocation();

  // Changes only when the calendar day changes, so the "Today" list rolls
  // over to the new day by itself after midnight.
  const todayKey = toKey(now);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // date filter: defaults to today only
  const [datePreset, setDatePreset] = useState("today");
  const [customFrom, setCustomFrom] = useState(todayKey);
  const [customTo, setCustomTo] = useState(todayKey);

  // self check-in state
  const [myEmployee, setMyEmployee] = useState(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [today, setToday] = useState(null);
  const [dayStatus, setDayStatus] = useState(null); // holiday / week-off info
  const [busy, setBusy] = useState(null); // "in" | "out" | "locate" | null
  const [geoMsg, setGeoMsg] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [actionError, setActionError] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);

  /* ---------- date range ---------- */
  // { startKey, endKey } as "YYYY-MM-DD", or null for "all dates".
  const range = useMemo(() => {
    switch (datePreset) {
      case "today":
        return { startKey: todayKey, endKey: todayKey };
      case "yesterday": {
        const y = addDays(todayKey, -1);
        return { startKey: y, endKey: y };
      }
      case "week":
        return { startKey: addDays(todayKey, -6), endKey: todayKey };
      case "month": {
        const t = fromKey(todayKey);
        return {
          startKey: toKey(new Date(t.getFullYear(), t.getMonth(), 1)),
          endKey: todayKey,
        };
      }
      case "custom": {
        const a = customFrom || todayKey;
        const b = customTo || a;
        return a <= b ? { startKey: a, endKey: b } : { startKey: b, endKey: a };
      }
      default:
        return null; // all
    }
  }, [datePreset, customFrom, customTo, todayKey]);

  const startKey = range?.startKey || null;
  const endKey = range?.endKey || null;

  const rangeLabel = !range
    ? "All dates"
    : startKey === endKey
      ? startKey === todayKey
        ? `Today · ${fmtKeyLong(startKey)}`
        : fmtKeyLong(startKey)
      : `${fmtKeyLong(startKey)} – ${fmtKeyLong(endKey)}`;

  const rangeIsToday = startKey === todayKey && endKey === todayKey;

  const changePreset = (value) => {
    setDatePreset(value);
    if (value === "custom") {
      // start the custom picker on the day currently being viewed
      setCustomFrom(startKey || todayKey);
      setCustomTo(endKey || todayKey);
    }
  };

  /* ---------- data ---------- */
  const fetchRecords = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError("");
        const fields = [];
        if (statusFilter !== "all") {
          fields.push({ field: "status", operator: "eq", value: statusFilter });
        }
        if (startKey && endKey) {
          fields.push({
            field: "date",
            operator: "gte",
            value: startOfDayFromKey(startKey).toISOString(),
          });
          fields.push({
            field: "date",
            operator: "lte",
            value: endOfDayFromKey(endKey).toISOString(),
          });
        }
        const result = await getAttendance({ page, limit: 20, fields });
        setRecords(result.data.data.data);
        setPagination(result.data.data.pagination);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, startKey, endKey],
  );

  // Runs on first load and whenever the status, the date range, or the
  // calendar day (for the "Today" view) changes.
  useEffect(() => {
    fetchRecords(1);
  }, [fetchRecords]);

  const loadToday = useCallback(async (employee) => {
    try {
      const res = await getAttendance({
        limit: 1,
        fields: [{ field: "employeeId", operator: "eq", value: employee._id }],
      });
      const latest = res.data.data.data[0];
      setToday(latest && sameDay(latest.date, new Date()) ? latest : null);
    } catch {
      setToday(null);
    }
  }, []);

  // who am I as an employee?
  useEffect(() => {
    if (!canCheckIn) return;
    getMyEmployee()
      .then((res) => {
        const emp = res.data.data;
        setMyEmployee(emp);
        loadToday(emp);
      })
      .catch(() => setProfileMissing(true));
  }, [canCheckIn, loadToday]);

  // New day: clear yesterday's check-in card so the buttons reset.
  useEffect(() => {
    if (myEmployee) loadToday(myEmployee);
  }, [todayKey, myEmployee, loadToday]);

  // Is today a holiday or a week-off day? Re-checked when the day changes.
  useEffect(() => {
    if (!canCheckIn) return;
    getDayStatus()
      .then((res) => setDayStatus(res.data.data))
      .catch(() => setDayStatus(null));
  }, [canCheckIn, todayKey]);

  /* ---------- check in / out ---------- */
  const enableLocation = async () => {
    setGeoMsg("");
    setActionError("");
    try {
      setBusy("locate");
      const pos = await getPosition();
      setGeoMsg(
        `Location enabled (accuracy about ${Math.round(pos.accuracy)} m).`,
      );
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleAction = async (kind) => {
    setActionError("");
    setActionMsg("");
    setGeoMsg("");
    try {
      setBusy(kind);
      const pos = await getPosition(); // browser asks the user for permission here
      const location = { latitude: pos.latitude, longitude: pos.longitude };
      const res =
        kind === "in" ? await checkIn(location) : await checkOut(location);
      setToday(res.data.data);
      setActionMsg(
        kind === "in"
          ? "You're checked in. Have a great day!"
          : "You're checked out. See you tomorrow!",
      );
      fetchRecords(1);
    } catch (err) {
      setActionError(
        err.isGeo ? err.message : err.response?.data?.message || err.message,
      );
    } finally {
      setBusy(null);
    }
  };

  /* ---------- admin actions ---------- */
  const handleDelete = async (rec) => {
    if (!window.confirm("Delete this attendance record?")) return;
    try {
      await deleteAttendance(rec._id);
      fetchRecords(pagination.page);
    } catch (err) {
      alert(err.response?.data?.message || err.message || "Failed to delete");
    }
  };

  /* ---------- view helpers ---------- */
  // Everything comes from the list response (employee, user, department...).
  const view = (rec) => {
    const emp = rec.employee || null;
    const name = rec.employeeName || emp?.name || "-";
    return {
      name,
      email: emp?.email || "",
      department: emp?.department || "",
      designation: emp?.designation || "",
      profileImage: rec.profileImage || emp?.profileImage || null,
    };
  };

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return records
      .filter((r) => {
        if (!startKey || !endKey) return true;
        const k = toKey(new Date(r.date));
        return k >= startKey && k <= endKey;
      })
      .map((r) => ({ r, v: view(r) }))
      .filter(
        ({ v }) =>
          v.name.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.department.toLowerCase().includes(q),
      );
  }, [records, search, startKey, endKey]);

  const count = (status) => records.filter((r) => r.status === status).length;
  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  const checkedIn = !!today?.checkIn;
  const checkedOut = !!today?.checkOut;

  // Holiday or week-off: check-in is not allowed (the server enforces it too).
  const offDay = !!dayStatus && dayStatus.allowed === false;
  const locationBlocked =
    permission === "denied" || permission === "unsupported";

  // The Date column is only useful when more than one day can be shown.
  const singleDay = !!range && startKey === endKey;
  const showDateCol = !singleDay;

  const colCount =
    (showDateCol ? 1 : 0) + (isStaff ? 0 : 1) + 5 + (canManage ? 1 : 0);

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Attendance Records</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Attendance</h1>
          <p>
            {isStaff
              ? "Check in and out, and review your attendance history."
              : "Check in and out, and manage attendance across your company."}
          </p>
        </div>
        {canManage && (
          <button
            className="btn primary"
            onClick={() => {
              setSelected(null);
              setModalMode("create");
            }}
          >
            <Icon name="plusCircle" size={17} />
            Add Record
          </button>
        )}
      </div>

      {/* ---------- Check-in card ---------- */}
      {canCheckIn && (
        <section className="panel" style={{ marginBottom: 20 }}>
          {profileMissing ? (
            <div className="muted">
              Your account has no employee profile yet, so you can't check in.
              Ask an admin to add you under Employees.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: 24,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 180 }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  {now.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.2 }}>
                  {now.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </div>
              </div>

              <div style={{ display: "flex", gap: 28, flex: 1, minWidth: 220 }}>
                <div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    Checked in
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {fmtTime(today?.checkIn)}
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    Checked out
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {fmtTime(today?.checkOut)}
                  </div>
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 12.5 }}>
                    Hours today
                  </div>
                  <div style={{ fontWeight: 600 }}>
                    {checkedIn
                      ? hoursBetween(today.checkIn, today.checkOut || now)
                      : "-"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {!checkedIn && (
                  <button
                    className="btn primary"
                    disabled={
                      !myEmployee || !!busy || locationBlocked || offDay
                    }
                    title={offDay ? dayStatus.message : ""}
                    onClick={() => handleAction("in")}
                  >
                    <Icon name="clock" size={16} />
                    {busy === "in" ? "Getting location..." : "Check In"}
                  </button>
                )}
                {checkedIn && !checkedOut && (
                  <button
                    className="btn primary"
                    disabled={!!busy || locationBlocked}
                    onClick={() => handleAction("out")}
                  >
                    <Icon name="clock" size={16} />
                    {busy === "out" ? "Getting location..." : "Check Out"}
                  </button>
                )}
                {checkedOut && (
                  <span className="badge success">Done for today</span>
                )}
              </div>
            </div>
          )}

          {/* Holiday / week-off notice */}
          {!profileMissing && offDay && !checkedIn && (
            <div
              className="badge warning"
              style={{
                display: "block",
                padding: 12,
                whiteSpace: "normal",
                lineHeight: 1.5,
                marginTop: 16,
              }}
            >
              {dayStatus.type === "holiday" ? "🎉 " : "🛋️ "}
              {dayStatus.message}
            </div>
          )}

          {/* Location permission helper */}
          {!profileMissing && (
            <div style={{ marginTop: 16 }}>
              {permission === "denied" && (
                <div
                  className="badge warning"
                  style={{
                    display: "block",
                    padding: 12,
                    whiteSpace: "normal",
                    lineHeight: 1.5,
                  }}
                >
                  Location is blocked for this site. Click the lock icon next to
                  the address bar, set <b>Location</b> to <b>Allow</b>, then
                  reload this page.
                </div>
              )}
              {permission === "unsupported" && (
                <div
                  className="badge warning"
                  style={{
                    display: "block",
                    padding: 12,
                    whiteSpace: "normal",
                  }}
                >
                  This browser doesn't support location, so check-in isn't
                  available here.
                </div>
              )}
              {(permission === "prompt" || permission === "unknown") &&
                !checkedOut &&
                !offDay && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="muted" style={{ fontSize: 13 }}>
                      Your location is recorded when you check in and out. Your
                      browser will ask for permission.
                    </span>
                    <button
                      className="btn btn-sm"
                      disabled={!!busy}
                      onClick={enableLocation}
                    >
                      {busy === "locate" ? "Locating..." : "Enable location"}
                    </button>
                  </div>
                )}
              {permission === "granted" && !checkedOut && !offDay && (
                <span className="muted" style={{ fontSize: 13 }}>
                  Location access is on. It will be attached to your check-in
                  and check-out.
                </span>
              )}
              {geoMsg && (
                <div
                  style={{ color: "var(--green)", fontSize: 13, marginTop: 8 }}
                >
                  {geoMsg}
                </div>
              )}
              {actionMsg && (
                <div
                  style={{ color: "var(--green)", fontSize: 13, marginTop: 8 }}
                >
                  {actionMsg}
                </div>
              )}
              {actionError && (
                <div
                  style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}
                >
                  {actionError}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <div className="stat-grid">
        <StatCard
          tone="green"
          icon="userCheck"
          label="Present (this page)"
          value={count("present")}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Late (this page)"
          value={count("late")}
        />
        <StatCard
          tone="blue"
          icon="calendar"
          label="Half day (this page)"
          value={count("half_day")}
        />
        <StatCard
          tone="purple"
          icon="users"
          label="Absent (this page)"
          value={count("absent")}
        />
      </div>

      {/* ---------- Records ---------- */}
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Attendance Records</h2>
            <p>
              {rangeLabel}
              {" · "}
              {isStaff
                ? "Your attendance history."
                : "Daily attendance for your company."}
            </p>
          </div>
          <div className="panel-tools" style={{ flexWrap: "wrap" }}>
            {!isStaff && (
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}

            <select
              className="lang-btn"
              value={datePreset}
              onChange={(e) => changePreset(e.target.value)}
              aria-label="Filter by date"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            {datePreset === "custom" && (
              <>
                <input
                  type="date"
                  className="lang-btn"
                  value={customFrom}
                  max={todayKey}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomFrom(v);
                    // keep "to" in step until the user sets a range
                    if (!customTo || customTo < v) setCustomTo(v);
                  }}
                  aria-label="From date"
                />
                <span className="muted" style={{ fontSize: 12.5 }}>
                  to
                </span>
                <input
                  type="date"
                  className="lang-btn"
                  value={customTo}
                  min={customFrom || undefined}
                  max={todayKey}
                  onChange={(e) => setCustomTo(e.target.value)}
                  aria-label="To date"
                />
              </>
            )}

            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">Filter: All</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half_day">Half day</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading attendance...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {showDateCol && <th>Date</th>}
                    {!isStaff && <th>Employee</th>}
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Location</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={colCount}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        {rangeIsToday
                          ? offDay
                            ? `No attendance today. ${dayStatus.message.replace(" Check-in is not available.", "")}`
                            : "No attendance recorded yet today."
                          : "No attendance records for this period."}
                        {datePreset !== "all" && (
                          <>
                            {" "}
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ marginLeft: 8 }}
                              onClick={() => changePreset("week")}
                            >
                              View last 7 days
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                  {rows.map(({ r, v }, i) => {
                    const badge =
                      STATUS_BADGE[r.status] || STATUS_BADGE.present;
                    const inLink = mapLink(r.checkInLocation);
                    const outLink = mapLink(r.checkOutLocation);
                    const sub = [v.department, v.designation]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <tr key={r._id}>
                        {showDateCol && <td>{fmtDate(r.date)}</td>}
                        {!isStaff && (
                          <td>
                            <div className="company-cell">
                              <PersonAvatar
                                key={v.profileImage || r._id}
                                name={v.name}
                                profileImage={v.profileImage}
                                color={AVATAR_COLORS[i % AVATAR_COLORS.length]}
                              />
                              <div>
                                <div style={{ fontWeight: 500 }}>{v.name}</div>
                                {(v.email || sub) && (
                                  <div
                                    className="muted"
                                    style={{ fontSize: 12, fontWeight: 400 }}
                                  >
                                    {sub || v.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )}
                        <td>{fmtTime(r.checkIn)}</td>
                        <td>{fmtTime(r.checkOut)}</td>
                        <td>{hoursBetween(r.checkIn, r.checkOut)}</td>
                        <td>
                          <span className={`badge ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {r.autoCheckedOut && (
                            <span
                              className="muted"
                              style={{ fontSize: 11.5, marginLeft: 6 }}
                              title="Checked out automatically"
                            >
                              auto
                            </span>
                          )}
                        </td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                            }}
                          >
                            {inLink ? (
                              <a
                                href={inLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--blue)" }}
                              >
                                In
                              </a>
                            ) : null}
                            {outLink ? (
                              <a
                                href={outLink}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--blue)" }}
                              >
                                Out
                              </a>
                            ) : null}
                            {!inLink && !outLink && (
                              <span className="muted">-</span>
                            )}
                            {r.isWithinGeofence === true && (
                              <span className="badge success">In zone</span>
                            )}
                            {r.isWithinGeofence === false && (
                              <span className="badge warning">
                                Outside zone
                              </span>
                            )}
                          </div>
                        </td>
                        {canManage && (
                          <td>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                className="btn btn-sm"
                                onClick={() => {
                                  setSelected(r);
                                  setModalMode("edit");
                                }}
                              >
                                <Icon name="edit" size={13} /> Edit
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(r)}
                              >
                                <Icon name="trash" size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} records
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRecords(pagination.page - 1)}
                  aria-label="Previous page"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
                {Array.from(
                  { length: pagination.total_pages || 1 },
                  (_, n) => n + 1,
                ).map((p) => (
                  <button
                    key={p}
                    className={p === pagination.page ? "active" : ""}
                    onClick={() => fetchRecords(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchRecords(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalMode && (
        <AttendanceFormModal
          mode={modalMode}
          record={selected}
          onClose={() => {
            setModalMode(null);
            setSelected(null);
          }}
          onSaved={() => {
            fetchRecords(pagination.page);
            if (myEmployee) loadToday(myEmployee);
          }}
        />
      )}
    </>
  );
}
