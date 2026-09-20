import React, { useState, useEffect, useMemo } from "react";
import "../pages/dashboard.css";
import { Icon } from "../components/Icon";

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */
const STAT_CARDS = [
  {
    label: "Total Companies",
    value: "12",
    change: "+2 new this month",
    dir: "up",
    icon: "building",
    color: "blue",
    cta: "View All",
  },
  {
    label: "Total Employees",
    value: "2,482",
    change: "+8% from last month",
    dir: "up",
    icon: "users",
    color: "blue",
    cta: "View All",
  },
  {
    label: "Active Users",
    value: "2,368",
    change: "+6% from last month",
    dir: "up",
    icon: "userCheck",
    color: "green",
    cta: "View All",
  },
  {
    label: "Total Revenue",
    value: "$48,750",
    change: "+12% from last month",
    dir: "up",
    icon: "dollar",
    color: "purple",
    cta: "View Reports",
  },
  {
    label: "Open Support Tickets",
    value: "7",
    change: "-42% from last week",
    dir: "down",
    icon: "headphones",
    color: "pink",
    cta: "View Tickets",
  },
];

const GROWTH_DATA = [
  { m: "Jan", v: 1450 },
  { m: "Feb", v: 1620 },
  { m: "Mar", v: 1800 },
  { m: "Apr", v: 1950 },
  { m: "May", v: 2150 },
  { m: "Jun", v: 2482 },
];

const DEPARTMENTS = [
  { name: "Engineering", pct: 32, count: 794, color: "#3b82f6" },
  { name: "Marketing", pct: 18, count: 447, color: "#f97316" },
  { name: "Sales", pct: 16, count: 397, color: "#a855f7" },
  { name: "HR", pct: 8, count: 198, color: "#ec4899" },
  { name: "Finance", pct: 7, count: 174, color: "#06b6d4" },
  { name: "Operations", pct: 19, count: 472, color: "#ef4444" },
];

const QUICK_ACTIONS = [
  { label: "Add Company", icon: "building", color: "blue" },
  { label: "Add Employee", icon: "userPlus", color: "green" },
  { label: "Create Leave Policy", icon: "edit", color: "purple" },
  { label: "Run Payroll", icon: "play", color: "orange" },
  { label: "Generate Report", icon: "barChart", color: "teal" },
  { label: "System Settings", icon: "settings", color: "gray" },
];

const SYSTEM_STATS = [
  {
    label: "Total Logins (24h)",
    value: "1,248",
    change: "+20%",
    icon: "users",
    color: "blue",
  },
  {
    label: "Active Sessions",
    value: "342",
    change: "+15%",
    icon: "activity",
    color: "purple",
  },
  {
    label: "Server Uptime",
    value: "99.98%",
    change: "+0.02%",
    icon: "server",
    color: "green",
  },
  {
    label: "Database Size",
    value: "1.2 TB",
    change: "+8%",
    icon: "database",
    color: "cyan",
  },
];

const COMPANIES = [
  {
    name: "TechVision Pvt. Ltd.",
    employees: 482,
    status: "Active",
    plan: "Enterprise",
  },
  {
    name: "GreenLeaf Solutions",
    employees: 356,
    status: "Active",
    plan: "Pro",
  },
  { name: "Nova Digital", employees: 298, status: "Active", plan: "Pro" },
  {
    name: "Skyline Industries",
    employees: 230,
    status: "Active",
    plan: "Business",
  },
  { name: "Zenith Corp", employees: 187, status: "Active", plan: "Business" },
  { name: "PixelForge", employees: 164, status: "Pending", plan: "Business" },
];

const RECENT_ACTIVITY = [
  {
    icon: "building",
    color: "green",
    title: "New company registered",
    desc: "CloudPeak Technologies has been added",
    time: "2 hours ago",
  },
  {
    icon: "userPlus",
    color: "blue",
    title: "Employee joined",
    desc: "Aarav Shrestha joined at TechVision Pvt. Ltd.",
    time: "3 hours ago",
  },
  {
    icon: "dollar",
    color: "purple",
    title: "Payroll processed",
    desc: "Payroll for May 2025 completed for 12 companies",
    time: "5 hours ago",
  },
  {
    icon: "edit",
    color: "orange",
    title: "Leave policy updated",
    desc: "New leave policy added by Super Admin",
    time: "6 hours ago",
  },
  {
    icon: "headphones",
    color: "pink",
    title: "Support ticket resolved",
    desc: "Ticket #TS-458 has been resolved",
    time: "8 hours ago",
  },
];

const REVENUE_MONTHLY = [
  { m: "Jan", enterprise: 12000, pro: 8000, business: 6000, basic: 3000 },
  { m: "Feb", enterprise: 13000, pro: 9000, business: 6500, basic: 3200 },
  { m: "Mar", enterprise: 14500, pro: 9500, business: 7000, basic: 3400 },
  { m: "Apr", enterprise: 15500, pro: 10000, business: 7500, basic: 3600 },
  { m: "May", enterprise: 16800, pro: 10800, business: 8000, basic: 3800 },
];

const REVENUE_YEARLY = [
  { m: "2022", enterprise: 98000, pro: 61000, business: 41000, basic: 19000 },
  { m: "2023", enterprise: 124000, pro: 78000, business: 52000, basic: 24000 },
  { m: "2024", enterprise: 156000, pro: 96000, business: 66000, basic: 30000 },
  {
    m: "2025",
    enterprise: 184200,
    pro: 142300,
    business: 105600,
    basic: 51200,
  },
];

const REVENUE_LEGEND = [
  { name: "Enterprise", value: "$18,420", color: "#3b82f6" },
  { name: "Pro", value: "$14,230", color: "#f97316" },
  { name: "Business", value: "$10,560", color: "#a855f7" },
  { name: "Basic", value: "$5,120", color: "#06b6d4" },
];

const TOP_COMPANIES = COMPANIES.slice(0, 5);

const SUPPORT_TICKETS = [
  {
    id: "TS-458",
    subject: "Payroll issue",
    priority: "High",
    status: "Open",
    created: "2h ago",
  },
  {
    id: "TS-457",
    subject: "Leave balance wrong",
    priority: "Medium",
    status: "In Progress",
    created: "5h ago",
  },
  {
    id: "TS-456",
    subject: "Login problem",
    priority: "Low",
    status: "Resolved",
    created: "8h ago",
  },
  {
    id: "TS-455",
    subject: "System error",
    priority: "High",
    status: "Open",
    created: "12h ago",
  },
  {
    id: "TS-454",
    subject: "New company setup",
    priority: "Medium",
    status: "In Progress",
    created: "1d ago",
  },
];

/* ------------------------------------------------------------------ */
/*  Small chart components (pure SVG, zero chart-library dependency)   */
/* ------------------------------------------------------------------ */
function LineAreaChart({ data }) {
  const width = 640;
  const height = 220;
  const padL = 36;
  const padB = 24;
  const max = 3000;
  const stepX = (width - padL - 10) / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = height - padB - (d.v / max) * (height - padB - 10);
    return [x, y];
  });

  const linePath = points
    .map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`))
    .join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0]},${height - padB} L${points[0][0]},${height - padB} Z`;

  const yTicks = [0, 500, 1000, 1500, 2000, 2500, 3000];

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="line-chart-svg">
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => {
        const y = height - padB - (t / max) * (height - padB - 10);
        return (
          <g key={t}>
            <line x1={padL} x2={width} y1={y} y2={y} className="grid-line" />
            <text x={0} y={y + 4} className="axis-label">
              {t === 0 ? "0" : t >= 1000 ? `${t / 1000}K` : t}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill="url(#growthFill)" stroke="none" />
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5" />

      {points.map((p, i) => (
        <circle
          key={i}
          cx={p[0]}
          cy={p[1]}
          r={i === points.length - 1 ? 5 : 3.5}
          className="line-dot"
        />
      ))}

      {data.map((d, i) => (
        <text
          key={d.m}
          x={padL + i * stepX}
          y={height + 14}
          className="axis-label"
          textAnchor="middle"
        >
          {d.m}
        </text>
      ))}
    </svg>
  );
}

function DonutChart({ data, total }) {
  const size = 176;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d) => {
            const dash = (d.pct / 100) * c;
            const seg = (
              <circle
                key={d.name}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
      </svg>
      <div className="donut-center">
        <strong>{total.toLocaleString()}</strong>
        <span>Total</span>
      </div>
    </div>
  );
}

function StackedBarChart({ data }) {
  const width = 560;
  const height = 220;
  const padB = 24;
  const padL = 34;
  const max = 40000;
  const barW = 34;
  const gap = (width - padL) / data.length;
  const keys = [
    { key: "enterprise", color: "#3b82f6" },
    { key: "pro", color: "#f97316" },
    { key: "business", color: "#a855f7" },
    { key: "basic", color: "#06b6d4" },
  ];
  const yTicks = [0, 10000, 20000, 30000, 40000];

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} className="bar-chart-svg">
      {yTicks.map((t) => {
        const y = height - padB - (t / max) * (height - padB - 10);
        return (
          <g key={t}>
            <line x1={padL} x2={width} y1={y} y2={y} className="grid-line" />
            <text x={0} y={y + 4} className="axis-label">
              {t === 0 ? "$0" : `$${t / 1000}K`}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const cx = padL + gap * i + gap / 2;
        let cumulative = 0;
        return (
          <g key={d.m}>
            {keys.map(({ key, color }) => {
              const val = d[key];
              const h = (val / max) * (height - padB - 10);
              const y = height - padB - cumulative - h;
              cumulative += h;
              return (
                <rect
                  key={key}
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={h}
                  rx="3"
                  fill={color}
                />
              );
            })}
            <text
              x={cx}
              y={height + 14}
              className="axis-label"
              textAnchor="middle"
            >
              {d.m}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard content (no sidebar/topbar/footer — those live in       */
/*  DashboardLayout and render via <Outlet/>)                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [page, setPage] = useState(1);
  const [revenueView, setRevenueView] = useState("monthly");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const dateStr = useMemo(
    () =>
      now.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    [now],
  );
  const timeStr = useMemo(
    () =>
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) +
      " (NPT)",
    [now],
  );

  const revenueData =
    revenueView === "monthly" ? REVENUE_MONTHLY : REVENUE_YEARLY;

  return (
    <>
      {/* Welcome banner */}
      <div className="welcome-row">
        <div className="welcome-text">
          <h1>
            <Icon name="crown" size={22} className="crown-icon" /> Welcome back,
            Sujan!
          </h1>
          <p>Here&apos;s what&apos;s happening across all companies.</p>
        </div>
        <div className="welcome-meta">
          <span>
            <Icon name="calendar" size={15} /> {dateStr}
          </span>
          <span>
            <Icon name="clock" size={15} /> {timeStr}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {STAT_CARDS.map((s) => (
          <div className="stat-card" key={s.label}>
            <div className={`stat-icon ${s.color}`}>
              <Icon name={s.icon} size={20} />
            </div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className={`stat-change ${s.dir}`}>
              <Icon name="trending" size={12} /> {s.change}
            </div>
            <a className="stat-cta" href="#!">
              {s.cta} <Icon name="chevronRight" size={13} />
            </a>
          </div>
        ))}
      </div>

      {/* Row: growth chart / department donut / quick actions */}
      <div className="row row-3col">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="trending" size={16} /> Employee Growth{" "}
              <span className="panel-sub">(Across All Companies)</span>
            </h2>
            <span className="pill up">
              <Icon name="trending" size={12} /> 18% vs last 6 months
            </span>
          </div>
          <LineAreaChart data={GROWTH_DATA} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="userCheck" size={16} /> Employees by Department
            </h2>
          </div>
          <div className="donut-section">
            <DonutChart data={DEPARTMENTS} total={2482} />
            <ul className="legend-list">
              {DEPARTMENTS.map((d) => (
                <li key={d.name}>
                  <span className="dot" style={{ background: d.color }} />
                  <span className="legend-name">{d.name}</span>
                  <span className="legend-pct">{d.pct}%</span>
                  <span className="legend-count">({d.count})</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel quick-actions-panel">
          <div className="panel-head">
            <h2>
              <Icon name="plusCircle" size={16} /> Quick Actions
            </h2>
          </div>
          <div className="quick-grid">
            {QUICK_ACTIONS.map((a) => (
              <button className={`quick-btn ${a.color}`} key={a.label}>
                <Icon name={a.icon} size={17} />
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Row: companies table / activity / system stats */}
      <div className="row row-3col row-uneven">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="building" size={16} /> Companies Overview
            </h2>
            <a href="#!" className="view-all">
              View All <Icon name="chevronRight" size={13} />
            </a>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company Name</th>
                  <th>Employees</th>
                  <th>Status</th>
                  <th>Subscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {COMPANIES.map((c, i) => (
                  <tr key={c.name}>
                    <td>{i + 1}</td>
                    <td className="company-name">{c.name}</td>
                    <td>{c.employees}</td>
                    <td>
                      <span
                        className={`badge ${c.status === "Active" ? "success" : "warning"}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>{c.plan}</td>
                    <td>
                      <button className="more-btn">
                        <Icon name="more" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icon name="chevronLeft" size={14} />
            </button>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                className={page === n ? "active" : ""}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <span className="dots">…</span>
            <button
              className={page === 6 ? "active" : ""}
              onClick={() => setPage(6)}
            >
              6
            </button>
            <button
              disabled={page === 6}
              onClick={() => setPage((p) => Math.min(6, p + 1))}
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="activity" size={16} /> Recent Activity{" "}
              <span className="panel-sub">(Global)</span>
            </h2>
            <a href="#!" className="view-all">
              View All <Icon name="chevronRight" size={13} />
            </a>
          </div>
          <ul className="activity-list">
            {RECENT_ACTIVITY.map((a, i) => (
              <li key={i}>
                <span className={`activity-icon ${a.color}`}>
                  <Icon name={a.icon} size={15} />
                </span>
                <div className="activity-body">
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-desc">{a.desc}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="server" size={16} /> System Statistics
            </h2>
          </div>
          <div className="sys-stat-grid">
            {SYSTEM_STATS.map((s) => (
              <div className="sys-stat-card" key={s.label}>
                <div className={`stat-icon small ${s.color}`}>
                  <Icon name={s.icon} size={16} />
                </div>
                <div className="sys-stat-value">{s.value}</div>
                <div className="sys-stat-label">{s.label}</div>
                <div className="sys-stat-change up">
                  <Icon name="trending" size={11} /> {s.change}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Row: revenue chart / top companies / support tickets */}
      <div className="row row-3col row-bottom">
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="barChart" size={16} /> Subscription Plans &amp;
              Revenue
            </h2>
            <div className="toggle-group">
              <button
                className={revenueView === "monthly" ? "active" : ""}
                onClick={() => setRevenueView("monthly")}
              >
                <Icon name="clock" size={12} /> Monthly
              </button>
              <button
                className={revenueView === "yearly" ? "active" : ""}
                onClick={() => setRevenueView("yearly")}
              >
                <Icon name="calendar" size={12} /> Yearly
              </button>
            </div>
          </div>
          <div className="revenue-body">
            <StackedBarChart data={revenueData} />
            <ul className="legend-list vertical">
              {REVENUE_LEGEND.map((r) => (
                <li key={r.name}>
                  <span className="dot" style={{ background: r.color }} />
                  <span className="legend-name">{r.name}</span>
                  <span className="legend-count">{r.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="trending" size={16} /> Top Companies by Employees
            </h2>
            <a href="#!" className="view-all">
              View All <Icon name="chevronRight" size={13} />
            </a>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company Name</th>
                  <th>Employees</th>
                </tr>
              </thead>
              <tbody>
                {TOP_COMPANIES.map((c, i) => (
                  <tr key={c.name}>
                    <td>{i + 1}</td>
                    <td className="company-name">{c.name}</td>
                    <td>{c.employees}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="headphones" size={16} /> Recent Support Tickets
            </h2>
            <a href="#!" className="view-all">
              View All <Icon name="chevronRight" size={13} />
            </a>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {SUPPORT_TICKETS.map((t) => (
                  <tr key={t.id}>
                    <td>{t.id}</td>
                    <td>{t.subject}</td>
                    <td>
                      <span
                        className={`badge priority-${t.priority.toLowerCase()}`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge status-${t.status.replace(/\s/g, "").toLowerCase()}`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="muted">{t.created}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
