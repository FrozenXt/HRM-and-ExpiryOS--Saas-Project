import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { assetUrl } from "../../services/uploadService";
import { getCurrentUser } from "../../utils/auth";
import { FILE_BASE } from "../../config";
import "../../styles/admin-dashboard.css";

const money = (n, symbol) =>
  `${symbol || ""}${Number(n || 0).toLocaleString()}`;

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

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const fmtTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "-";

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
      })
    : "-";

// 8.5 -> "8h 30m"
const fmtHours = (h) => {
  if (h == null) return "-";
  const mins = Math.round(h * 60);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

const STATUS = {
  present: "Present",
  late: "Late",
  half_day: "Half day",
  on_leave: "On leave",
  absent: "Absent",
  inactive: "Inactive",
};

function StatusPill({ status }) {
  return (
    <span className={`ad-pill ad-pill--${status}`}>
      {STATUS[status] || status}
    </span>
  );
}

// Photo if there is one, otherwise coloured initials. Falls back to the
// initials if the image fails to load.
function Avatar({ name, src, size = 32, index = 0, ring }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);

  const style = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.38)),
    ...(ring ? { boxShadow: `0 0 0 2px ${ring}` } : {}),
  };

  if (src && !failed) {
    return (
      <img
        className="ad-avatar"
        src={`${FILE_BASE}${src}`}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        style={style}
      />
    );
  }
  return (
    <span
      className="ad-avatar"
      title={name}
      style={{
        ...style,
        background: AVATAR_COLORS[index % AVATAR_COLORS.length],
      }}
    >
      {initials(name)}
    </span>
  );
}

const RING = {
  present: "var(--green)",
  late: "#f59e0b",
  half_day: "var(--purple)",
  on_leave: "var(--blue)",
  absent: "var(--red)",
};

function PersonCell({ row, index }) {
  return (
    <div className="company-cell">
      <Avatar name={row.name} src={row.profileImage} index={index} />
      <div>
        <div style={{ fontWeight: 500 }}>{row.name}</div>
        {row.designation && row.designation !== "-" && (
          <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
            {row.designation}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- small building blocks ---------- */

function HeroStat({ icon, tone, label, value, sub }) {
  return (
    <div className="stat-card stat-card-row">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={22} />
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-trend">{sub}</div>}
      </div>
    </div>
  );
}

// Multi-segment donut, pure SVG.
function Donut({ segments, size = 168, stroke = 22 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-2)"
        strokeWidth={stroke}
      />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((seg) => {
          const dash = (seg.value / total) * c;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += dash;
          return el;
        })}
      </g>
    </svg>
  );
}

function DeptBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {data.map((d) => (
        <div key={d.department}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 6,
            }}
          >
            <span>{d.department}</span>
            <strong>{d.count}</strong>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "var(--surface-2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(d.count / max) * 100}%`,
                borderRadius: 999,
                background:
                  "linear-gradient(90deg, var(--blue), var(--blue-dark))",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- today's attendance table (tabbed) ---------- */

function AttendanceTable({ attendanceToday }) {
  const [tab, setTab] = useState("in");

  const a = attendanceToday;
  const checkedIn = useMemo(
    () =>
      [
        ...(a.presentList || []),
        ...(a.lateList || []),
        ...(a.halfDayList || []),
      ].sort((x, y) => new Date(x.checkIn || 0) - new Date(y.checkIn || 0)),
    [a],
  );

  const tabs = [
    {
      key: "in",
      label: "Checked in",
      count: checkedIn.length,
      rows: checkedIn,
    },
    {
      key: "late",
      label: "Late",
      count: a.lateCount || 0,
      rows: a.lateList || [],
    },
    {
      key: "half",
      label: "Half day",
      count: a.halfDayCount || 0,
      rows: a.halfDayList || [],
    },
    {
      key: "leave",
      label: "On leave",
      count: a.onLeaveCount || 0,
      rows: a.onLeaveList || [],
    },
    {
      key: "absent",
      label: "Absent",
      count: a.absentCount || 0,
      rows: a.absentList || [],
    },
  ];
  const current = tabs.find((t) => t.key === tab);

  const timeColumns = [
    { label: "Check in", render: (r) => fmtTime(r.checkIn) },
    { label: "Check out", render: (r) => fmtTime(r.checkOut) },
    {
      label: "Hours",
      render: (r) =>
        r.stillWorking ? (
          <span className="ad-pill ad-pill--working">Working</span>
        ) : (
          fmtHours(r.workedHours)
        ),
    },
    {
      label: "Status",
      render: (r) => <StatusPill status={r.attendanceStatus} />,
    },
  ];

  const columnsByTab = {
    in: timeColumns,
    late: timeColumns,
    half: timeColumns,
    leave: [
      { label: "Leave type", render: (r) => r.leaveType },
      { label: "From", render: (r) => fmtDate(r.fromDate) },
      { label: "To", render: (r) => fmtDate(r.toDate) },
    ],
    absent: [
      {
        label: "Email",
        render: (r) => <span className="muted">{r.email || "-"}</span>,
      },
    ],
  };
  const columns = columnsByTab[tab];

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>
          <Icon name="clock" size={16} /> Today's Attendance
        </h2>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {fmtDate(a.date)}
        </span>
      </div>

      <div className="ad-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`ad-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      <div className="table-wrap ad-scroll">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              {columns.map((c) => (
                <th key={c.label}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {current.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={2 + columns.length}
                  className="muted"
                  style={{ textAlign: "center", padding: 24 }}
                >
                  Nobody in this list today.
                </td>
              </tr>
            ) : (
              current.rows.map((r, i) => (
                <tr key={`${r.employeeId}-${i}`}>
                  <td>
                    <PersonCell row={r} index={i} />
                  </td>
                  <td>{r.department}</td>
                  {columns.map((c) => (
                    <td key={c.label}>{c.render(r)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- department-wise people ---------- */

function DepartmentCards({ departments }) {
  const [open, setOpen] = useState(null);

  if (!departments.length) {
    return (
      <div className="muted" style={{ fontSize: 13 }}>
        No departments yet.
      </div>
    );
  }

  return (
    <div className="ad-dept-grid">
      {departments.map((d, di) => {
        const key = String(d.departmentId || d.name);
        const isOpen = open === key;
        const visible = d.members.slice(0, 5);
        const more = d.members.length - visible.length;

        return (
          <div className="ad-dept-card" key={key}>
            <div className="ad-dept-head">
              <span className="ad-dept-name">{d.name}</span>
              <span className="ad-dept-count">
                {d.totalEmployees}{" "}
                {d.totalEmployees === 1 ? "person" : "people"}
              </span>
            </div>

            <div className="ad-bar">
              <div style={{ width: `${d.attendanceRate}%` }} />
            </div>
            <div className="ad-rate">{d.attendanceRate}% attendance today</div>

            <div className="ad-chips">
              <span className="ad-pill ad-pill--present">
                {d.presentCount} present
              </span>
              {d.lateCount > 0 && (
                <span className="ad-pill ad-pill--late">
                  {d.lateCount} late
                </span>
              )}
              {d.halfDayCount > 0 && (
                <span className="ad-pill ad-pill--half_day">
                  {d.halfDayCount} half day
                </span>
              )}
              {d.onLeaveCount > 0 && (
                <span className="ad-pill ad-pill--on_leave">
                  {d.onLeaveCount} on leave
                </span>
              )}
              {d.absentCount > 0 && (
                <span className="ad-pill ad-pill--absent">
                  {d.absentCount} absent
                </span>
              )}
            </div>

            <div className="ad-dept-foot">
              <div className="ad-stack">
                {visible.map((m, i) => (
                  <Avatar
                    key={m.employeeId}
                    name={m.name}
                    src={m.profileImage}
                    size={30}
                    index={di + i}
                    ring={RING[m.todayStatus]}
                  />
                ))}
                {more > 0 && <span className="ad-more">+{more}</span>}
              </div>
              {d.members.length > 0 && (
                <button
                  type="button"
                  className="ad-link"
                  onClick={() => setOpen(isOpen ? null : key)}
                >
                  {isOpen ? "Hide people" : "View people"}
                </button>
              )}
            </div>

            {isOpen && (
              <div className="ad-members">
                {d.members.map((m, i) => (
                  <div className="ad-member" key={m.employeeId}>
                    <Avatar
                      name={m.name}
                      src={m.profileImage}
                      size={34}
                      index={di + i}
                    />
                    <div className="ad-member-main">
                      <div className="ad-member-name">{m.name}</div>
                      <div className="ad-member-sub">
                        {m.designation !== "-" ? m.designation : m.email}
                      </div>
                    </div>
                    <div className="ad-member-side">
                      <StatusPill status={m.todayStatus} />
                      {m.checkIn && (
                        <div className="ad-member-time">
                          {fmtTime(m.checkIn)} –{" "}
                          {m.checkOut ? fmtTime(m.checkOut) : "now"}
                          {m.workedHours != null &&
                            ` · ${fmtHours(m.workedHours)}`}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- main ---------- */

export default function CompanyDashboard({ data }) {
  const navigate = useNavigate();
  const me = getCurrentUser();
  const {
    company,
    employees,
    departments,
    attendanceToday,
    payroll,
    pendingApprovals,
    upcomingBirthdays,
  } = data;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (me?.firstName || "there").split(" ")[0];
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const logo = company?.logo || company?.logoUrl;
  const currency = Object.values(payroll).find(
    (p) => p && p.currencySymbol,
  )?.currencySymbol;

  // Backend sends the rate against active employees; fall back for old data.
  const attendancePct =
    attendanceToday.attendanceRate ??
    (employees.total
      ? Math.round((attendanceToday.presentCount / employees.total) * 100)
      : 0);

  const donutSegments = [
    {
      label: "Present",
      value: Math.max(
        0,
        attendanceToday.presentCount -
          attendanceToday.lateCount -
          attendanceToday.halfDayCount,
      ),
      color: "var(--green)",
    },
    { label: "Late", value: attendanceToday.lateCount, color: "#f59e0b" },
    {
      label: "Half Day",
      value: attendanceToday.halfDayCount,
      color: "var(--purple)",
    },
    {
      label: "On Leave",
      value: attendanceToday.onLeaveCount,
      color: "var(--blue)",
    },
    {
      label: "Absent",
      value: attendanceToday.absentCount,
      color: "var(--red)",
    },
  ].filter((s) => s.value > 0);

  const recent = employees.list.slice(0, 6);
  const deptList = departments?.list || [];
  const birthdays = upcomingBirthdays || [];

  const quickActions = [
    { label: "Add Employee", icon: "userPlus", path: "/employees" },
    {
      label: "Review Leave Requests",
      icon: "calendar",
      path: "/leave-requests",
    },
    { label: "Process Payroll", icon: "dollar", path: "/payroll" },
    { label: "Post Job Opening", icon: "briefcase", path: "/recruitment" },
  ];

  return (
    <>
      {/* ---- Greeting header ---- */}
      <div className="welcome-row">
        <div
          className="welcome-text"
          style={{ display: "flex", alignItems: "center", gap: 14 }}
        >
          {logo && (
            <img
              src={assetUrl(logo)}
              alt={company?.name || ""}
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                objectFit: "contain",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
              }}
            />
          )}
          <div>
            <h1 style={{ marginBottom: 2 }}>
              {greeting}, {firstName} 👋
            </h1>
            <p>
              Here's what's happening at {company?.name || "your company"}
              {company?.plan ? ` · ${company.plan} plan` : ""}.
            </p>
          </div>
        </div>
        <div className="welcome-meta">
          <span>
            <Icon name="calendar" size={14} /> {todayStr}
          </span>
        </div>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="stat-grid">
        <HeroStat
          icon="users"
          tone="blue"
          label="Total Employees"
          value={employees.total}
          sub={`${employees.active} active`}
        />
        <HeroStat
          icon="calendar"
          tone="orange"
          label="On Leave"
          value={attendanceToday.onLeaveCount}
          sub="Today"
        />
        <HeroStat
          icon="userCheck"
          tone="green"
          label="Present Today"
          value={attendanceToday.presentCount}
          sub={`${attendancePct}% attendance`}
        />
        <HeroStat
          icon="headphones"
          tone="purple"
          label="Pending Approvals"
          value={
            pendingApprovals.leaveRequests + pendingApprovals.draftPayrolls
          }
          sub="Leave / Payroll"
        />
      </div>

      {/* ---- Attendance donut + Department bars ---- */}
      <div className="row row-3col" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="userCheck" size={16} /> Attendance Overview
            </h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Today
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 168,
                height: 168,
                flexShrink: 0,
              }}
            >
              <Donut
                segments={
                  donutSegments.length
                    ? donutSegments
                    : [
                        {
                          label: "No data",
                          value: 1,
                          color: "var(--surface-2)",
                        },
                      ]
                }
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <strong style={{ fontSize: 22 }}>{attendancePct}%</strong>
                <span className="muted" style={{ fontSize: 11.5 }}>
                  Present
                </span>
              </div>
            </div>
            <ul className="legend-list" style={{ flex: 1, minWidth: 150 }}>
              <li>
                <span className="dot" style={{ background: "var(--green)" }} />
                <span className="legend-name">Present</span>
                <span className="legend-pct">
                  {attendanceToday.presentCount}
                </span>
              </li>
              <li>
                <span className="dot" style={{ background: "var(--red)" }} />
                <span className="legend-name">Absent</span>
                <span className="legend-pct">
                  {attendanceToday.absentCount}
                </span>
              </li>
              <li>
                <span className="dot" style={{ background: "#f59e0b" }} />
                <span className="legend-name">Late</span>
                <span className="legend-pct">{attendanceToday.lateCount}</span>
              </li>
              <li>
                <span className="dot" style={{ background: "var(--purple)" }} />
                <span className="legend-name">Half Day</span>
                <span className="legend-pct">
                  {attendanceToday.halfDayCount}
                </span>
              </li>
              <li>
                <span className="dot" style={{ background: "var(--blue)" }} />
                <span className="legend-name">On Leave</span>
                <span className="legend-pct">
                  {attendanceToday.onLeaveCount}
                </span>
              </li>
            </ul>
          </div>

          <div className="ad-mini-grid">
            <div>
              <div className="ad-mini-label">First check-in</div>
              <div className="ad-mini-value">
                {fmtTime(attendanceToday.firstCheckIn)}
              </div>
            </div>
            <div>
              <div className="ad-mini-label">Last check-in</div>
              <div className="ad-mini-value">
                {fmtTime(attendanceToday.lastCheckIn)}
              </div>
            </div>
            <div>
              <div className="ad-mini-label">Still working</div>
              <div className="ad-mini-value">
                {attendanceToday.stillWorkingCount ?? 0}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="barChart" size={16} /> Employees by Department
            </h2>
          </div>
          {employees.byDepartment.length === 0 ? (
            <div className="muted" style={{ fontSize: 13 }}>
              No department data yet.
            </div>
          ) : (
            <DeptBars data={employees.byDepartment} />
          )}
        </section>
      </div>

      {/* ---- Today's attendance with times ---- */}
      <AttendanceTable attendanceToday={attendanceToday} />

      {/* ---- Department-wise people ---- */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            <Icon name="users" size={16} /> Departments
          </h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            {departments?.total ?? deptList.length} departments
          </span>
        </div>
        <DepartmentCards departments={deptList} />
      </section>

      {/* ---- Recent employees + Quick actions ---- */}
      <div className="row row-3col" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="users" size={16} /> Recent Employees
            </h2>
            <button
              className="view-all"
              onClick={() => navigate("/employees")}
              style={{ background: "none", border: 0, cursor: "pointer" }}
            >
              View all <Icon name="chevronRight" size={13} />
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Department</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="muted"
                      style={{ textAlign: "center", padding: 24 }}
                    >
                      No employees yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((e, i) => (
                    <tr key={e.employeeId}>
                      <td>
                        <div className="company-cell">
                          <Avatar
                            name={e.name}
                            src={e.profileImage}
                            index={i}
                          />
                          {e.name}
                        </div>
                      </td>
                      <td>{e.designation}</td>
                      <td>{e.department}</td>
                      <td className="muted">{e.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section className="panel">
            <div className="panel-head">
              <h2>
                <Icon name="plusCircle" size={16} /> Quick Actions
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {quickActions.map((a, i) => (
                <button
                  key={a.label}
                  className={i === 0 ? "btn primary" : "btn"}
                  style={{ justifyContent: "flex-start" }}
                  onClick={() => navigate(a.path)}
                >
                  <Icon name={a.icon} size={16} /> {a.label}
                </button>
              ))}
            </div>

            <div
              className="nav-section-title"
              style={{ padding: 0, margin: "18px 0 8px" }}
            >
              Payroll this period
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13.5,
              }}
            >
              <span className="muted">Net paid out</span>
              <strong>{money(payroll.released?.totalNetPay, currency)}</strong>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>
                <Icon name="calendar" size={16} /> Upcoming Birthdays
              </h2>
            </div>
            {birthdays.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                No birthdays in the next 30 days.
              </div>
            ) : (
              <div>
                {birthdays.slice(0, 5).map((b, i) => (
                  <div className="ad-member" key={b.employeeId}>
                    <Avatar
                      name={b.name}
                      src={b.profileImage}
                      size={34}
                      index={i}
                    />
                    <div className="ad-member-main">
                      <div className="ad-member-name">{b.name}</div>
                      <div className="ad-member-sub">{b.department}</div>
                    </div>
                    <div className="ad-member-side">
                      <span className="ad-pill">{fmtDate(b.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
