import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { getStaffDashboard } from "../services/dashboardService";
import { FILE_BASE } from "../config";
import "../styles/staff-calendar.css";
import "../pages/dashboard.css"; // .welcome-row / .stat-grid / .panel / .table-wrap / .activity-list / .badge

const STATUS_COLOR = {
  present: "var(--green)",
  late: "var(--amber)",
  half_day: "var(--purple)",
  absent: "var(--red)",
};
const STATUS_LABEL = {
  present: "Present",
  late: "Late",
  half_day: "Half Day",
  absent: "Absent",
};

// One entry per calendar state. Change a colour here to restyle that state.
const DISPLAY = {
  complete: { label: "Full day", color: "var(--green)" },
  late: { label: "Late", color: "var(--amber, #f59e0b)" },
  half_day: { label: "Half day", color: "var(--purple)" },
  incomplete: { label: "Incomplete", color: "var(--red)" },
  absent: { label: "Absent", color: "var(--red)" },
  holiday: { label: "Holiday", color: "#14b8a6" },
  weekoff: { label: "Week off", color: "var(--text-dim)" },
  leave: { label: "On leave", color: "var(--blue)" },
  working: { label: "Working", color: "var(--green)" },
  today_pending: { label: "Not in yet", color: "var(--text-dim)" },
  upcoming: { label: "", color: "var(--text-dim)" },
  before_joining: { label: "", color: "var(--text-dim)" },
  no_record: { label: "No record", color: "var(--text-dim)" },
  none: { label: "", color: "var(--text-dim)" },
};
const LEGEND_KEYS = [
  "complete",
  "late",
  "half_day",
  "incomplete",
  "absent",
  "holiday",
  "leave",
  "weekoff",
];

const EVENT_KIND = {
  birthday: { icon: "🎂", color: "#ec4899", label: "Birthday" },
  work_anniversary: { icon: "🎉", color: "#f59e0b", label: "Work anniversary" },
  company_event: { icon: "📣", color: "#8b5cf6", label: "Company event" },
  meeting: { icon: "👥", color: "#0ea5e9", label: "Meeting" },
  seminar: { icon: "🎤", color: "#6366f1", label: "Seminar" },
  other: { icon: "📌", color: "#64748b", label: "Event" },
};
// Titles with these words show as a seminar even if the type is "other".
const kindOf = (ev) =>
  /seminar|workshop|webinar|training/i.test(ev.title || "")
    ? "seminar"
    : EVENT_KIND[ev.kind]
      ? ev.kind
      : "other";

const PAYROLL_BADGE = {
  draft: "warning",
  submitted: "plan-default",
  approved: "success",
  released: "success",
  rejected: "warning",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const AVATAR_COLORS = ["#3b82f6", "#10b981", "#0ea5e9", "#f97316", "#7c3aed"];

/* ---------- helpers ---------- */

const pad = (n) => String(n).padStart(2, "0");

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const formatShortDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "-";

const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

// 8.5 -> "8h 30m"
const fmtHours = (h) => {
  if (h == null) return "-";
  const mins = Math.round(h * 60);
  return `${Math.floor(mins / 60)}h ${pad(mins % 60)}m`;
};

// "2026-12-25" -> "Dec 25"
const keyToShort = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const today = new Date();
  const t = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );
  const n = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((t - n) / 86400000);
}

// Photo if there is one, otherwise coloured initials.
function Avatar({ name, src, size = 32, index = 0 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const style = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.38)),
  };

  if (src && !failed) {
    return (
      <img
        className="sc-avatar"
        src={`${FILE_BASE}${src}`}
        alt={name}
        onError={() => setFailed(true)}
        style={style}
      />
    );
  }
  return (
    <span
      className="sc-avatar"
      style={{
        ...style,
        background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      }}
    >
      {initials(name)}
    </span>
  );
}

/* ---------- Ring progress chart ---------- */

function RingChart({
  percent,
  color = "var(--blue)",
  size = 150,
  strokeWidth = 14,
  centerValue,
  centerLabel,
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 0.3s ease" }}
      />
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        fontSize="26"
        fontWeight="700"
        fill="var(--text)"
      >
        {centerValue}
      </text>
      <text
        x="50%"
        y="63%"
        textAnchor="middle"
        fontSize="11.5"
        fill="var(--text-dim)"
      >
        {centerLabel}
      </text>
    </svg>
  );
}

/* ---------- Attendance calendar ---------- */

function tooltipFor(entry) {
  if (!entry) return "";
  const cfg = DISPLAY[entry.display] || DISPLAY.none;
  const parts = [cfg.label];
  if (entry.holiday) parts.push(entry.holiday.name);
  if (entry.leave) parts.push(entry.leave.type);
  if (entry.checkIn)
    parts.push(
      `in ${formatTime(entry.checkIn)}${entry.checkOut ? `, out ${formatTime(entry.checkOut)}` : ""}`,
    );
  if (entry.durationHours != null) parts.push(fmtHours(entry.durationHours));
  if (entry.isLate && entry.lateByMinutes)
    parts.push(`${entry.lateByMinutes}m late`);
  for (const ev of entry.events || []) parts.push(ev.title);
  return parts.filter(Boolean).join(" · ");
}

function DayDetail({ entry, policy, onClose }) {
  const cfg = DISPLAY[entry.display] || DISPLAY.none;
  const [y, m, d] = entry.dateKey.split("-").map(Number);
  const dateLabel = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const Item = ({ label, children }) => (
    <div>
      <div className="sc-detail-label">{label}</div>
      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{children}</div>
    </div>
  );

  return (
    <div className="sc-detail" style={{ "--c": cfg.color }}>
      <div className="sc-detail-head">
        <div>
          <strong>{dateLabel}</strong>
          {cfg.label && (
            <span
              className="badge"
              style={{ marginLeft: 10, color: cfg.color }}
            >
              {cfg.label}
            </span>
          )}
        </div>
        <button className="more-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="sc-detail-grid">
        {entry.holiday && (
          <Item label="Holiday">
            {entry.holiday.name}
            {entry.holiday.days > 1 &&
              ` (${keyToShort(entry.holiday.start)} – ${keyToShort(entry.holiday.end)})`}
          </Item>
        )}
        {entry.leave && <Item label="Leave type">{entry.leave.type}</Item>}
        {entry.checkIn && (
          <Item label="Check in">
            {formatTime(entry.checkIn)}
            {entry.isLate && entry.lateByMinutes > 0 && (
              <span style={{ color: "var(--amber)", marginLeft: 6 }}>
                {entry.lateByMinutes}m late
              </span>
            )}
          </Item>
        )}
        {entry.checkIn && (
          <Item label="Check out">
            {entry.checkOut ? (
              <>
                {formatTime(entry.checkOut)}
                {entry.autoCheckedOut && (
                  <span className="muted" style={{ marginLeft: 6 }}>
                    (auto)
                  </span>
                )}
              </>
            ) : entry.isToday ? (
              "Still working"
            ) : (
              <span style={{ color: "var(--red)" }}>Missing</span>
            )}
          </Item>
        )}
        {entry.durationHours != null && (
          <Item label="Hours worked">
            {fmtHours(entry.durationHours)}
            <span className="muted"> / {entry.requiredHours}h required</span>
          </Item>
        )}
        {entry.isWithinGeofence != null && (
          <Item label="Location">
            {entry.isWithinGeofence ? "Inside work zone" : "Outside work zone"}
          </Item>
        )}
        {!entry.checkIn &&
          !entry.holiday &&
          !entry.leave &&
          entry.display === "absent" && (
            <Item label="Attendance">No check-in recorded</Item>
          )}
        {entry.display === "weekoff" && <Item label="Day">Weekly off</Item>}
      </div>

      {entry.events?.length > 0 && (
        <div
          style={{
            marginTop: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {entry.events.map((ev, i) => {
            const k = EVENT_KIND[kindOf(ev)];
            return (
              <div
                key={i}
                style={{
                  fontSize: 13,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                {ev.kind === "birthday" ? (
                  <Avatar
                    name={ev.name}
                    src={ev.profileImage}
                    size={26}
                    index={i}
                  />
                ) : (
                  <span>{k.icon}</span>
                )}
                <div>
                  <strong style={{ color: k.color }}>{ev.title}</strong>
                  <span className="muted"> · {k.label}</span>
                  {ev.description && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {ev.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {policy && entry.display === "late" && (
        <div className="sc-policy">
          Late after {policy.lateAfter} (start {policy.startTime} +{" "}
          {policy.graceMinutes} min grace).
        </div>
      )}
    </div>
  );
}

function AttendanceCalendar({
  month,
  year,
  entries,
  policy,
  cellH,
  onCellHChange,
  loading,
  onPrev,
  onNext,
}) {
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [month, year]);

  const byKey = useMemo(() => {
    const map = {};
    for (const e of entries) map[e.dateKey] = e;
    return map;
  }, [entries]);

  // dots: small cells. mid: label + times. full: everything.
  const mode = cellH < 64 ? "dots" : cellH < 100 ? "mid" : "full";
  const maxEvents = mode === "full" ? 3 : 1;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const weekOff = policy?.weekOff || ["sat", "sun"];

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedEntry = selected ? byKey[selected] : null;

  return (
    <div style={{ opacity: loading ? 0.55 : 1, transition: "opacity 0.15s" }}>
      <div className="sc-toolbar">
        <div className="sc-nav">
          <button
            className="more-btn"
            onClick={onPrev}
            aria-label="Previous month"
          >
            <Icon name="chevronLeft" size={14} />
          </button>
          <strong style={{ fontSize: 14, minWidth: 130, textAlign: "center" }}>
            {monthLabel}
          </strong>
          <button className="more-btn" onClick={onNext} aria-label="Next month">
            <Icon name="chevronRight" size={14} />
          </button>
        </div>

        <label className="sc-slider" title="Calendar size">
          <span style={{ fontSize: 11 }}>A</span>
          <input
            type="range"
            min={40}
            max={140}
            step={4}
            value={cellH}
            onChange={(e) => onCellHChange(Number(e.target.value))}
            aria-label="Calendar size"
          />
          <span style={{ fontSize: 17 }}>A</span>
        </label>
      </div>

      <div className="sc-weekdays">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={weekOff.includes(WEEKDAY_KEYS[i]) ? "is-off" : ""}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="sc-grid" style={{ "--cell-h": `${cellH}px` }}>
        {cells.map((d, i) => {
          if (d === null)
            return <div key={`e${i}`} className="sc-cell is-empty" />;

          const key = `${year}-${pad(month)}-${pad(d)}`;
          const entry = byKey[key];
          const display = entry?.display || "none";
          const cfg = DISPLAY[display] || DISPLAY.none;
          const evs = entry?.events || [];
          const isToday = key === todayKey;
          const note = entry?.holiday?.name || entry?.leave?.type || "";

          return (
            <button
              type="button"
              key={key}
              className={[
                "sc-cell",
                `sc-cell--${display}`,
                mode !== "dots" ? "is-large" : "",
                isToday ? "is-today" : "",
                selected === key ? "is-selected" : "",
              ].join(" ")}
              style={{ "--c": cfg.color }}
              title={tooltipFor(entry)}
              onClick={() => setSelected(selected === key ? null : key)}
            >
              <span className="sc-day">{d}</span>
              {entry?.isComplete && mode === "full" && (
                <span className="sc-check">✓</span>
              )}

              {mode === "dots" && (
                <>
                  {cfg.label && <span className="sc-dot" />}
                  {evs.length > 0 && (
                    <span className="sc-emoji">
                      {evs
                        .slice(0, 2)
                        .map((e) => EVENT_KIND[kindOf(e)].icon)
                        .join("")}
                    </span>
                  )}
                </>
              )}

              {mode !== "dots" && (
                <>
                  {cfg.label && <span className="sc-label">{cfg.label}</span>}
                  {note && (
                    <span className="sc-sub" title={note}>
                      {note}
                    </span>
                  )}
                  {entry?.checkIn && (
                    <span className="sc-sub">
                      {formatTime(entry.checkIn)} –{" "}
                      {entry.checkOut ? formatTime(entry.checkOut) : "…"}
                    </span>
                  )}
                  {mode === "full" && entry?.durationHours != null && (
                    <span className="sc-sub">
                      {fmtHours(entry.durationHours)}
                    </span>
                  )}
                  {mode === "full" && entry?.isLate && display !== "late" && (
                    <span className="sc-tag">Late</span>
                  )}
                  {evs.slice(0, maxEvents).map((e, idx) => {
                    const k = EVENT_KIND[kindOf(e)];
                    return (
                      <span
                        key={idx}
                        className="sc-ev"
                        style={{ "--ev": k.color }}
                        title={e.title}
                      >
                        {k.icon} {e.title}
                      </span>
                    );
                  })}
                  {evs.length > maxEvents && (
                    <span className="sc-sub">
                      +{evs.length - maxEvents} more
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      <div className="sc-legend">
        {LEGEND_KEYS.map((k) => (
          <span key={k} style={{ "--c": DISPLAY[k].color }}>
            <i />
            {DISPLAY[k].label}
          </span>
        ))}
        {["birthday", "seminar", "company_event", "meeting"].map((k) => (
          <span key={k}>
            {EVENT_KIND[k].icon} {EVENT_KIND[k].label}
          </span>
        ))}
      </div>

      {selectedEntry && (
        <DayDetail
          entry={selectedEntry}
          policy={policy}
          onClose={() => setSelected(null)}
        />
      )}

      {policy && (
        <div className="sc-policy">
          Work hours {policy.startTime}–{policy.endTime} · late after{" "}
          {policy.lateAfter} · week off:{" "}
          {weekOff.length ? weekOff.join(", ") : "none"}
        </div>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */

export default function StaffDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [cellH, setCellH] = useState(() => {
    try {
      return Number(localStorage.getItem("staffCalendarCellH")) || 56;
    } catch {
      return 56;
    }
  });
  const changeCellH = (v) => {
    setCellH(v);
    try {
      localStorage.setItem("staffCalendarCellH", String(v));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await getStaffDashboard({ month, year });
        if (!cancelled) setData(res.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Only the first load replaces the page; later month changes just dim the calendar.
  if (loading && !data) {
    return (
      <div className="muted" style={{ padding: "24px 0" }}>
        Loading dashboard...
      </div>
    );
  }
  if (error && !data) {
    return (
      <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
    );
  }
  if (!data) return null;

  const {
    employee,
    leave,
    upcomingHolidays,
    upcomingBirthdays,
    attendance,
    payroll,
  } = data;

  const attendancePct =
    attendance.summary.totalDays > 0
      ? Math.round(
          (attendance.summary.present / attendance.summary.totalDays) * 100,
        )
      : 0;
  const leavePct =
    leave.totals.total > 0
      ? Math.round((leave.totals.remaining / leave.totals.total) * 100)
      : 0;
  const firstName = employee.name?.split(" ")[0] || "there";
  const todayStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // A bigger calendar takes the whole row.
  const calendarPanelStyle =
    cellH >= 84 ? { gridColumn: "1 / -1" } : { gridColumn: "span 2" };

  return (
    <>
      <div className="welcome-row">
        <div
          className="welcome-text"
          style={{ display: "flex", alignItems: "center", gap: 14 }}
        >
          <Avatar name={employee.name} src={employee.profileImage} size={48} />
          <div>
            <h1 style={{ marginBottom: 2 }}>Hello, {firstName} 👋</h1>
            <p>Here&apos;s your HR overview for today.</p>
          </div>
        </div>
        <div className="welcome-meta">
          <span>{todayStr}</span>
        </div>
      </div>

      {/* ---- Top stat strip ---- */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon green">
            <Icon name="calendar" size={20} />
          </div>
          <div className="stat-label">Total Leaves</div>
          <div className="stat-value">{leave.totals.remaining}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            remaining (this year)
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <Icon name="userCheck" size={20} />
          </div>
          <div className="stat-label">Used Leaves</div>
          <div className="stat-value">{leave.totals.used}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            this year
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <Icon name="calendar" size={20} />
          </div>
          <div className="stat-label">Upcoming Holidays</div>
          <div className="stat-value">{upcomingHolidays.length}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            upcoming
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon pink">
            <Icon name="userPlus" size={20} />
          </div>
          <div className="stat-label">Next Birthday</div>
          {upcomingBirthdays[0] ? (
            <>
              <div className="stat-value" style={{ fontSize: 16 }}>
                {upcomingBirthdays[0].name}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                {formatShortDate(upcomingBirthdays[0].date)}
              </div>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
              None coming up
            </div>
          )}
        </div>
      </div>

      {/* ---- Attendance ring / Holidays list / Birthdays list ---- */}
      <div className="row row-3col">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="clock" size={16} /> Your Attendance
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <RingChart
              percent={attendancePct}
              color="var(--green)"
              centerValue={`${attendancePct}%`}
              centerLabel="Present"
            />
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flex: 1,
                minWidth: 120,
              }}
            >
              {["present", "late", "half_day", "absent"].map((k) => (
                <li
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: STATUS_COLOR[k],
                    }}
                  />
                  <span style={{ color: "var(--text-dim)" }}>
                    {STATUS_LABEL[k]}
                  </span>
                  <strong style={{ marginLeft: "auto" }}>
                    {attendance.summary[k]}
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="calendar" size={16} /> Upcoming Holidays
            </h2>
          </div>
          {upcomingHolidays.length === 0 ? (
            <p className="muted">No upcoming holidays.</p>
          ) : (
            <ul className="activity-list">
              {upcomingHolidays.map((h, i) => (
                <li key={i}>
                  <span className="activity-icon purple">
                    <Icon name="calendar" size={15} />
                  </span>
                  <div className="activity-body">
                    <div className="activity-title">{h.name}</div>
                    <div className="activity-time">
                      {formatShortDate(h.date)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="userPlus" size={16} /> Upcoming Birthdays
            </h2>
          </div>
          {upcomingBirthdays.length === 0 ? (
            <p className="muted">No upcoming birthdays.</p>
          ) : (
            <ul className="activity-list">
              {upcomingBirthdays.map((b, i) => (
                <li key={i}>
                  <Avatar
                    name={b.name}
                    src={b.profileImage}
                    size={30}
                    index={i}
                  />
                  <div className="activity-body">
                    <div className="activity-title">{b.name}</div>
                    <div className="activity-time">
                      {formatShortDate(b.date)}
                      {daysUntil(b.date) != null
                        ? ` · in ${daysUntil(b.date)}d`
                        : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ---- Calendar / My Leaves ---- */}
      <div className="row row-3col">
        <section className="panel" style={calendarPanelStyle}>
          <div className="panel-head">
            <h2>
              <Icon name="barChart" size={16} /> Attendance Calendar
            </h2>
          </div>
          <AttendanceCalendar
            month={attendance.month}
            year={attendance.year}
            entries={attendance.calendar}
            policy={attendance.policy}
            cellH={cellH}
            onCellHChange={changeCellH}
            loading={loading}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="pieChart" size={16} /> My Leaves
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            <RingChart
              percent={leavePct}
              color="var(--blue)"
              centerValue={leave.totals.remaining}
              centerLabel="remaining"
            />
            <div style={{ display: "flex", gap: 20, fontSize: 13 }}>
              <span>
                Total <strong>{leave.totals.total}</strong>
              </span>
              <span>
                Used <strong>{leave.totals.used}</strong>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* ---- Recent Payroll ---- */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            <Icon name="dollar" size={16} /> Recent Payroll
          </h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Period</th>
                <th>Status</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {payroll.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="muted"
                    style={{ textAlign: "center", padding: 24 }}
                  >
                    No payroll records yet.
                  </td>
                </tr>
              ) : (
                payroll.map((p) => (
                  <tr key={p.id}>
                    <td>{p.period}</td>
                    <td>
                      <span
                        className={`badge ${PAYROLL_BADGE[p.status] || "warning"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      {p.currencySymbol}
                      {p.grossPay.toLocaleString()}
                    </td>
                    <td>
                      {p.currencySymbol}
                      {p.deductions.toLocaleString()}
                    </td>
                    <td>
                      <strong>
                        {p.currencySymbol}
                        {p.netPay.toLocaleString()}
                      </strong>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
