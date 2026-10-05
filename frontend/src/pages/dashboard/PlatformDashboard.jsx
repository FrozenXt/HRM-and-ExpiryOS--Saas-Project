import { useState } from "react";
import { Icon } from "../../components/Icon";
import StatCard from "../../components/StatCard";
import { assetUrl } from "../../services/uploadService";

// Set this to your billing currency symbol, e.g. "Rs ", "$", "₹".
const CURRENCY = "";

const STATUS_TONE = {
  active: "success",
  trial: "plan-business",
  past_due: "warning",
  suspended: "warning",
  cancelled: "plan-default",
};
const cap = (s = "") =>
  s ? s[0].toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
const money = (n) => `${CURRENCY}${Number(n || 0).toLocaleString()}`;
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#7c3aed",
  "#ec4899",
  "#14b8a6",
];

const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

function Logo({ name, src, index = 0, size = 34 }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={assetUrl(src)}
        alt={name}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: "contain",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: COLORS[index % COLORS.length],
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </span>
  );
}

function CompanyCell({ row, index }) {
  return (
    <div className="company-cell">
      <Logo name={row.name} src={row.logo} index={index} />
      <div>
        <div style={{ fontWeight: 500 }}>{row.name}</div>
        <div className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
          {row.plan}
          {row.country ? ` · ${row.country}` : ""}
        </div>
      </div>
    </div>
  );
}

function DaysBadge({ days }) {
  if (days === null || days === undefined)
    return <span className="muted">-</span>;
  const cls =
    days < 0
      ? "warning"
      : days <= 7
        ? "warning"
        : days <= 30
          ? "plan-business"
          : "success";
  return (
    <span className={`badge ${cls}`}>
      {days < 0
        ? `Expired ${Math.abs(days)}d ago`
        : days === 0
          ? "Today"
          : `${days}d left`}
    </span>
  );
}

function BarRow({ label, value, max, right, color = "var(--blue)" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          marginBottom: 6,
        }}
      >
        <span>{label}</span>
        <strong>{right}</strong>
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
            width: `${max ? Math.min(100, (value / max) * 100) : 0}%`,
            borderRadius: 999,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

function CompanyTable({ rows, empty, onOpen, columns }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            {columns.map((c) => (
              <th key={c.label}>{c.label}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 2}
                className="muted"
                style={{ textAlign: "center", padding: 22 }}
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.id}>
                <td>
                  <CompanyCell row={r} index={i} />
                </td>
                {columns.map((c) => (
                  <td key={c.label}>{c.render(r)}</td>
                ))}
                <td>
                  <button className="btn btn-sm" onClick={() => onOpen(r.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function PlatformDashboard({
  data,
  onSelectCompany,
  companies = [],
}) {
  const {
    totals = {},
    revenue = { byPlan: [] },
    growth = [],
    subscriptionBreakdown = [],
    expiringSoon = [],
    needsAttention = [],
    nearLimit = [],
    pendingVerification = [],
    topCompanies = [],
    recentCompanies = [],
  } = data;

  const maxPlanMrr = Math.max(1, ...revenue.byPlan.map((p) => p.mrr));
  const maxGrowth = Math.max(1, ...growth.map((g) => g.newCompanies));
  const maxEmp = Math.max(1, ...topCompanies.map((c) => c.employees));
  const totalSubs = subscriptionBreakdown.reduce((n, s) => n + s.count, 0) || 1;

  const statusCol = {
    label: "Status",
    render: (r) => (
      <span className={`badge ${STATUS_TONE[r.status] || "plan-default"}`}>
        {cap(r.status)}
      </span>
    ),
  };
  const endsCol = { label: "Ends", render: (r) => fmtDate(r.endDate) };
  const daysCol = {
    label: "Time left",
    render: (r) => <DaysBadge days={r.daysLeft} />,
  };
  const empCol = {
    label: "Employees",
    render: (r) =>
      `${r.employees}${r.employeeLimit ? ` / ${r.employeeLimit}` : ""}`,
  };

  return (
    <>
      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Platform Overview</h1>
          <p>Companies, subscriptions and revenue across the whole platform.</p>
        </div>
      </div>

      {/* ---- Headline numbers ---- */}
      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="building"
          label="Total Companies"
          value={totals.totalCompanies ?? 0}
        />
        <StatCard
          tone="green"
          icon="userCheck"
          label="Active Companies"
          value={totals.activeCompanies ?? 0}
        />
        <StatCard
          tone="purple"
          icon="users"
          label="Total Employees"
          value={totals.totalEmployees ?? 0}
        />
        <StatCard
          tone="orange"
          icon="dollar"
          label="Monthly Revenue (MRR)"
          value={money(revenue.mrr)}
        />
      </div>
      <div className="stat-grid">
        <StatCard
          tone="green"
          icon="dollar"
          label="Annual Revenue (ARR)"
          value={money(revenue.arr)}
        />
        <StatCard
          tone="blue"
          icon="clock"
          label="On Trial"
          value={totals.trialCompanies ?? 0}
        />
        <StatCard
          tone="orange"
          icon="fileText"
          label="Pending Verification"
          value={
            (totals.pendingVerificationCount ?? 0) +
            (totals.pendingDocuments ?? 0)
          }
        />
        <StatCard
          tone="purple"
          icon="activity"
          label="Needs Action"
          value={
            (totals.pastDueCompanies ?? 0) +
            (totals.suspendedCompanies ?? 0) +
            (totals.expiredCount ?? 0)
          }
        />
      </div>

      {/* ---- Subscriptions + revenue by plan ---- */}
      <div className="row row-3col" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="dollar" size={16} /> Subscriptions
            </h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {totals.payingCompanies ?? 0} paying
            </span>
          </div>
          {subscriptionBreakdown.length === 0 ? (
            <p className="muted">No subscriptions yet.</p>
          ) : (
            subscriptionBreakdown.map((s) => (
              <BarRow
                key={s.status}
                label={
                  <span
                    className={`badge ${STATUS_TONE[s.status] || "plan-default"}`}
                  >
                    {cap(s.status)}
                  </span>
                }
                value={s.count}
                max={totalSubs}
                right={s.count}
                color="var(--blue)"
              />
            ))
          )}
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Joined this month:{" "}
            <strong>{totals.newCompaniesThisMonth ?? 0}</strong> companies,{" "}
            <strong>{totals.newEmployeesThisMonth ?? 0}</strong> employees
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="barChart" size={16} /> Revenue by Plan
            </h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Avg {money(revenue.averagePerCompany)} / company
            </span>
          </div>
          {revenue.byPlan.length === 0 ? (
            <p className="muted">No plans yet.</p>
          ) : (
            revenue.byPlan.map((p, i) => (
              <BarRow
                key={p.plan}
                label={
                  <>
                    {p.plan}{" "}
                    <span className="muted" style={{ fontSize: 12 }}>
                      · {p.payingCompanies}/{p.companies} paying ·{" "}
                      {money(p.price)}/mo
                    </span>
                  </>
                }
                value={p.mrr}
                max={maxPlanMrr}
                right={money(p.mrr)}
                color={COLORS[i % COLORS.length]}
              />
            ))
          )}
          <div className="muted" style={{ fontSize: 11.5 }}>
            {revenue.note}
          </div>
        </section>
      </div>

      {/* ---- Growth + top companies ---- */}
      <div className="row row-3col" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="activity" size={16} /> Growth (last 6 months)
            </h2>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 12,
              height: 150,
            }}
          >
            {growth.map((g) => (
              <div key={g.month} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                  {g.newCompanies}
                </div>
                <div
                  title={`${g.newCompanies} new, ${money(g.newMrr)} new MRR`}
                  style={{
                    height: `${Math.max(4, (g.newCompanies / maxGrowth) * 100)}px`,
                    borderRadius: 6,
                    background:
                      "linear-gradient(180deg, var(--blue), var(--blue-dark, var(--blue)))",
                  }}
                />
                <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                  {g.label}
                </div>
              </div>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            New companies per month. Hover a bar for the new MRR.
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="users" size={16} /> Largest Companies
            </h2>
          </div>
          {topCompanies.length === 0 ? (
            <p className="muted">No companies yet.</p>
          ) : (
            topCompanies.map((c, i) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <Logo name={c.name} src={c.logo} index={i} size={32} />
                <div style={{ flex: 1 }}>
                  <BarRow
                    label={c.name}
                    value={c.employees}
                    max={maxEmp}
                    right={`${c.employees} employees`}
                    color={COLORS[i % COLORS.length]}
                  />
                </div>
              </div>
            ))
          )}
        </section>
      </div>

      {/* ---- Expiring soon ---- */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            <Icon name="clock" size={16} /> Subscriptions Expiring Soon
          </h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Next 60 days · {totals.expiringSoonCount ?? 0} total
          </span>
        </div>
        <CompanyTable
          rows={expiringSoon}
          empty="No subscriptions expiring in the next 60 days."
          onOpen={onSelectCompany}
          columns={[statusCol, endsCol, daysCol, empCol]}
        />
      </section>

      {/* ---- Needs attention ---- */}
      <section className="panel">
        <div className="panel-head">
          <h2>
            <Icon name="activity" size={16} /> Needs Attention
          </h2>
          <span className="muted" style={{ fontSize: 12.5 }}>
            Past due, suspended or expired
          </span>
        </div>
        <CompanyTable
          rows={needsAttention}
          empty="Nothing needs attention right now."
          onOpen={onSelectCompany}
          columns={[statusCol, endsCol, daysCol, empCol]}
        />
      </section>

      {/* ---- Near limit + pending verification ---- */}
      <div className="row row-3col" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="users" size={16} /> Near Employee Limit
            </h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              90% or more
            </span>
          </div>
          <CompanyTable
            rows={nearLimit}
            empty="No company is close to its limit."
            onOpen={onSelectCompany}
            columns={[
              empCol,
              {
                label: "Usage",
                render: (r) => (
                  <span
                    className={`badge ${r.usagePct >= 100 ? "warning" : "plan-business"}`}
                  >
                    {r.usagePct}%
                  </span>
                ),
              },
            ]}
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="fileText" size={16} /> Pending Verification
            </h2>
            <span className="muted" style={{ fontSize: 12.5 }}>
              {totals.pendingDocuments ?? 0} documents to review
            </span>
          </div>
          <CompanyTable
            rows={pendingVerification}
            empty="No companies waiting for verification."
            onOpen={onSelectCompany}
            columns={[{ label: "Joined", render: (r) => fmtDate(r.createdAt) }]}
          />
        </section>
      </div>

      {/* ---- Recent companies + jump ---- */}
      <div
        className="row row-3col"
        style={{ gridTemplateColumns: "1.6fr 1fr" }}
      >
        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="building" size={16} /> Recently Added
            </h2>
          </div>
          <CompanyTable
            rows={recentCompanies}
            empty="No companies yet."
            onOpen={onSelectCompany}
            columns={[
              statusCol,
              { label: "Joined", render: (r) => fmtDate(r.createdAt) },
              empCol,
            ]}
          />
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>
              <Icon name="building" size={16} /> Jump to a company
            </h2>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: -4 }}>
            Pick a company to see its attendance, payroll and leave activity.
          </p>
          <select
            className="search-box"
            style={{ width: "100%", padding: "9px 12px", marginTop: 8 }}
            defaultValue=""
            onChange={(e) => e.target.value && onSelectCompany(e.target.value)}
          >
            <option value="" disabled>
              Select a company...
            </option>
            {companies.map((c) => (
              <option key={c._id} value={c._id}>
                {c.legalName}
              </option>
            ))}
          </select>
        </section>
      </div>
    </>
  );
}
