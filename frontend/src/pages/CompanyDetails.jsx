import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../components/Icon";
import StatCard from "../components/StatCard";
import CompanyFormModal from "../components/CompanyFormModal";
import { assetUrl } from "../services/uploadService";
import { listOptions } from "../services/employeeService";
import {
  getCompanyById,
  verifyCompany,
  listByCompany,
} from "../services/companyDetailService";

/* ---------- helpers ---------- */
const idOf = (v) => v?._id || v || "";
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "";
const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
const cap = (s = "") => (s ? s[0].toUpperCase() + s.slice(1) : "");

const SUB_BADGE = {
  active: "success",
  trial: "plan-business",
  past_due: "warning",
  suspended: "warning",
  cancelled: "warning",
};
const VERIFY_BADGE = {
  verified: "success",
  pending: "plan-default",
  rejected: "warning",
};

function Card({ title, icon, children, action }) {
  return (
    <section className="panel">
      <div className="panel-head" style={{ marginBottom: 6 }}>
        <h2>
          <Icon name={icon} size={16} /> {title}
        </h2>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

function Detail({ label, children, wide }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div
      className="detail-row"
      style={wide ? { gridColumn: "1 / -1" } : undefined}
    >
      <div className="detail-label">{label}</div>
      <div className="detail-value">
        {empty ? <span className="muted">Not provided</span> : children}
      </div>
    </div>
  );
}

export default function CompanyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [plan, setPlan] = useState(null);
  const [currency, setCurrency] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [counts, setCounts] = useState({ users: null, employees: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoFailed, setLogoFailed] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const c = await getCompanyById(id);
      setCompany(c);
      setLogoFailed(false);

      // Related data. Any of these may fail without breaking the page.
      const [plans, currencies, users, employees] = await Promise.allSettled([
        listOptions("plans"),
        listOptions("currencies"),
        listByCompany("users", id, 100),
        listByCompany("employees", id, 1),
      ]);

      if (plans.status === "fulfilled")
        setPlan(plans.value.find((p) => p._id === idOf(c.planId)) || null);
      if (currencies.status === "fulfilled")
        setCurrency(
          currencies.value.find((x) => x._id === idOf(c.currencyId)) || null,
        );
      if (users.status === "fulfilled")
        setAdminUser(
          users.value.rows.find((u) => u._id === idOf(c.adminUserId)) || null,
        );

      setCounts({
        users: users.status === "fulfilled" ? users.value.total : null,
        employees:
          employees.status === "fulfilled" ? employees.value.total : null,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to load company",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (approved) => {
    if (
      !window.confirm(
        approved ? "Approve this company?" : "Reject this company?",
      )
    )
      return;
    try {
      setVerifying(true);
      const updated = await verifyCompany(id, approved);
      setCompany((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      alert(
        err.response?.data?.message || err.message || "Verification failed",
      );
    } finally {
      setVerifying(false);
    }
  };

  /* ---------- states ---------- */
  if (loading && !company) {
    return (
      <div className="muted" style={{ padding: "40px 0" }}>
        Loading company...
      </div>
    );
  }
  if (error) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ color: "var(--red)", marginBottom: 14 }}>{error}</div>
        <button className="btn" onClick={() => navigate("/companies")}>
          <Icon name="chevronLeft" size={14} /> Back to companies
        </button>
      </div>
    );
  }
  if (!company) return null;

  /* ---------- derived ---------- */
  const address = company.address || {};
  const contact = company.contactPerson || {};
  const stat = company.statutoryConfig || {};
  const addressLine = [
    address.line1,
    address.line2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  const limit = Number(company.employeeLimit) || 0;
  const usedPct =
    limit && counts.employees != null
      ? Math.min(100, Math.round((counts.employees / limit) * 100))
      : 0;

  const daysLeft = company.subscriptionEndDate
    ? Math.ceil((new Date(company.subscriptionEndDate) - new Date()) / 86400000)
    : null;
  const daysLabel =
    daysLeft == null
      ? "—"
      : daysLeft < 0
        ? `Expired ${Math.abs(daysLeft)}d ago`
        : `${daysLeft} days`;

  const planName = plan?.name || "—";
  const currencyText = currency
    ? `${currency.code}${currency.name ? ` — ${currency.name}` : ""}`
    : "";

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <button
          type="button"
          onClick={() => navigate("/companies")}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            color: "inherit",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          Companies
        </button>
        <Icon name="chevronRight" size={12} />
        <span className="current">{company.legalName}</span>
      </div>

      {/* ---------- Hero ---------- */}
      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="company-hero">
          {company.logoUrl && !logoFailed ? (
            <img
              className="hero-logo"
              src={assetUrl(company.logoUrl)}
              alt={`${company.legalName} logo`}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="hero-logo hero-fallback">
              {initials(company.legalName)}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 24 }}>
              {company.legalName}
            </h1>
            <div className="muted" style={{ fontSize: 13.5, marginBottom: 10 }}>
              {[
                company.tradeName && company.tradeName !== company.legalName
                  ? `Trading as ${company.tradeName}`
                  : null,
                company.industry,
                `ID #${company.id_int ?? "-"}`,
              ]
                .filter(Boolean)
                .join("  •  ")}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                className={`badge ${company.isActive ? "success" : "warning"}`}
              >
                {company.isActive ? "Active" : "Inactive"}
              </span>
              <span
                className={`badge ${VERIFY_BADGE[company.verificationStatus] || "plan-default"}`}
              >
                {cap(company.verificationStatus) || "Unverified"}
              </span>
              <span
                className={`badge ${SUB_BADGE[company.subscriptionStatus] || "plan-default"}`}
              >
                Subscription:{" "}
                {cap(company.subscriptionStatus).replace("_", " ")}
              </span>
              {plan && (
                <span className="badge plan-enterprise">{planName} plan</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => navigate("/companies")}>
              <Icon name="chevronLeft" size={14} /> Back
            </button>
            <button className="btn primary" onClick={() => setShowEdit(true)}>
              <Icon name="edit" size={15} /> Edit Company
            </button>
          </div>
        </div>

        {company.verificationStatus === "pending" && (
          <div className="verify-bar">
            <span>This company is waiting for verification.</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-sm btn-danger"
                disabled={verifying}
                onClick={() => handleVerify(false)}
              >
                Reject
              </button>
              <button
                className="btn btn-sm primary"
                disabled={verifying}
                onClick={() => handleVerify(true)}
              >
                Approve
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ---------- Stats ---------- */}
      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="users"
          label="Employees"
          value={counts.employees ?? "—"}
          trend={limit ? `of ${limit} allowed (${usedPct}%)` : "No limit set"}
        />
        <StatCard
          tone="green"
          icon="userCheck"
          label="Users"
          value={counts.users ?? "—"}
        />
        <StatCard tone="purple" icon="list" label="Plan" value={planName} />
        <StatCard
          tone="orange"
          icon="calendar"
          label="Subscription ends"
          value={daysLabel}
          trend={
            company.subscriptionEndDate
              ? fmtDate(company.subscriptionEndDate)
              : undefined
          }
        />
      </div>

      {limit > 0 && counts.employees != null && (
        <section className="panel" style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 13.5,
            }}
          >
            <span>Employee seats used</span>
            <span className="muted">
              {counts.employees} / {limit}
            </span>
          </div>
          <div className="progress">
            <div
              className="progress-bar"
              style={{
                width: `${usedPct}%`,
                background: usedPct >= 90 ? "var(--red)" : "var(--blue)",
              }}
            />
          </div>
        </section>
      )}

      {/* ---------- Detail cards ---------- */}
      <div className="detail-grid">
        <Card title="Company Information" icon="building">
          <div className="detail-list">
            <Detail label="Legal name">{company.legalName}</Detail>
            <Detail label="Trade name">{company.tradeName}</Detail>
            <Detail label="Registration no.">
              {company.registrationNumber}
            </Detail>
            <Detail label="Tax ID">{company.taxId}</Detail>
            <Detail label="Industry">{company.industry}</Detail>
            <Detail label="Founded">{fmtDate(company.foundedDate)}</Detail>
            <Detail label="Country">{company.country}</Detail>
          </div>
        </Card>

        <Card title="Contact Person" icon="users">
          <div className="detail-list">
            <Detail label="Name">{contact.name}</Detail>
            <Detail label="Designation">{contact.designation}</Detail>
            <Detail label="Email">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  style={{ color: "var(--blue)" }}
                >
                  {contact.email}
                </a>
              )}
            </Detail>
            <Detail label="Phone">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  style={{ color: "var(--blue)" }}
                >
                  {contact.phone}
                </a>
              )}
            </Detail>
          </div>
        </Card>

        <Card title="Address" icon="globe">
          <div className="detail-list">
            <Detail label="Address line 1">{address.line1}</Detail>
            <Detail label="Address line 2">{address.line2}</Detail>
            <Detail label="City">{address.city}</Detail>
            <Detail label="State / Province">{address.state}</Detail>
            <Detail label="Country">{address.country}</Detail>
            <Detail label="Postal code">{address.postalCode}</Detail>
            {addressLine && (
              <Detail label="Full address" wide>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressLine)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--blue)" }}
                >
                  {addressLine}
                </a>
              </Detail>
            )}
          </div>
        </Card>

        <Card title="Subscription & Billing" icon="dollar">
          <div className="detail-list">
            <Detail label="Plan">{plan ? planName : null}</Detail>
            <Detail label="Status">
              <span
                className={`badge ${SUB_BADGE[company.subscriptionStatus] || "plan-default"}`}
              >
                {cap(company.subscriptionStatus)}
              </span>
            </Detail>
            <Detail label="Currency">{currencyText}</Detail>
            <Detail label="Employee limit">
              {company.employeeLimit ? company.employeeLimit : "Unlimited"}
            </Detail>
            <Detail label="Start date">
              {fmtDate(company.subscriptionStartDate)}
            </Detail>
            <Detail label="End date">
              {fmtDate(company.subscriptionEndDate)}
            </Detail>
            <Detail label="Billing email" wide>
              {company.billingEmail && (
                <a
                  href={`mailto:${company.billingEmail}`}
                  style={{ color: "var(--blue)" }}
                >
                  {company.billingEmail}
                </a>
              )}
            </Detail>
          </div>
        </Card>

        <Card title="Company Admin" icon="crown">
          {adminUser ? (
            <div className="detail-list">
              <Detail label="Name">
                {`${adminUser.firstName} ${adminUser.lastName || ""}`.trim()}
              </Detail>
              <Detail label="Email">{adminUser.email}</Detail>
              <Detail label="Role">{cap(adminUser.role)}</Detail>
              <Detail label="Status">
                <span
                  className={`badge ${adminUser.status === "active" ? "success" : "warning"}`}
                >
                  {cap(adminUser.status)}
                </span>
              </Detail>
              <Detail label="Last login">
                {adminUser.lastLoginAt
                  ? fmtDateTime(adminUser.lastLoginAt)
                  : "Never"}
              </Detail>
              <Detail label="Password reset">
                {adminUser.mustResetPassword
                  ? "Required on next login"
                  : "Not required"}
              </Detail>
            </div>
          ) : (
            <div className="muted" style={{ padding: "8px 0" }}>
              Admin details are not available.
            </div>
          )}
        </Card>

        <Card title="Statutory Information" icon="fileText">
          <div className="detail-list">
            <Detail label="PAN of company">{stat.panOfCompany}</Detail>
            <Detail label="TAN number">{stat.tanNumber}</Detail>
            <Detail label="GSTIN">{stat.gstin}</Detail>
            <Detail label="PF establishment ID">
              {stat.pfEstablishmentId}
            </Detail>
            <Detail label="ESI establishment ID">
              {stat.esiEstablishmentId}
            </Detail>
            <Detail label="Professional tax state">{stat.ptState}</Detail>
          </div>
        </Card>

        <Card title="Verification" icon="userCheck">
          <div className="detail-list">
            <Detail label="Status">
              <span
                className={`badge ${VERIFY_BADGE[company.verificationStatus] || "plan-default"}`}
              >
                {cap(company.verificationStatus)}
              </span>
            </Detail>
            <Detail label="Verified at">
              {fmtDateTime(company.verifiedAt)}
            </Detail>
            <Detail label="Active">{company.isActive ? "Yes" : "No"}</Detail>
          </div>
        </Card>

        <Card title="Record Details" icon="clock">
          <div className="detail-list">
            <Detail label="Company ID" wide>
              <code style={{ fontSize: 12.5 }}>{company._id}</code>
            </Detail>
            <Detail label="Created">{fmtDateTime(company.createdAt)}</Detail>
            <Detail label="Last updated">
              {fmtDateTime(company.updatedAt)}
            </Detail>
          </div>
        </Card>
      </div>

      {showEdit && (
        <CompanyFormModal
          mode="edit"
          company={company}
          onClose={() => setShowEdit(false)}
          onSaved={load}
        />
      )}
    </>
  );
}
