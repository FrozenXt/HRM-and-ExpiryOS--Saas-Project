import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "./Icon";
import { getCurrentUser } from "../utils/auth";
import { useBranding } from "../context/BrandingContext";

/* ---------- nav config (unchanged) ---------- */

const TOP_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: "grid",
    path: "/dashboard",
    roles: ["super_admin", "admin", "hr", "staff"],
  },
  {
    id: "companies",
    label: "Companies",
    icon: "building",
    path: "/companies",
    roles: ["super_admin"],
  },
  {
    id: "my-company",
    label: "My Company",
    icon: "building",
    path: "/company",
    roles: ["admin", "hr", "staff"],
  },
  {
    id: "users",
    label: "Users",
    icon: "users",
    path: "/users",
    roles: ["super_admin", "admin", "hr"],
  },
  {
    id: "plans",
    label: "Plans",
    icon: "list",
    path: "/plans",
    roles: ["super_admin"],
  },
  {
    id: "subscriptions",
    label: "Subscriptions",
    icon: "list",
    path: "/subscriptions",
    roles: ["super_admin"],
  },
  {
    id: "my-subscription",
    label: "My Subscription",
    icon: "dollar",
    path: "/my-subscription",
    roles: ["admin"],
  },
  {
    id: "system-settings",
    label: "System Settings",
    icon: "settings",
    path: "/system-settings",
    roles: ["super_admin", "admin"],
  },
];

const MANAGEMENT_GROUPS = [
  {
    id: "hr-management",
    label: "HR Management",
    icon: "briefcase",
    items: [
      {
        id: "departments",
        label: "Departments",
        icon: "folder",
        path: "/departments",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "designations",
        label: "Designations",
        icon: "badge",
        path: "/designations",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "document-types",
        label: "Document Types",
        icon: "fileText",
        path: "/document-types",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "documents",
        label: "Documents",
        icon: "file",
        path: "/documents",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "company-documents",
        label: "Company Documents",
        icon: "building",
        path: "/company-documents",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "employees",
        label: "Employees",
        icon: "users",
        path: "/employees",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "resignations",
        label: "Resignations",
        icon: "userPlus",
        path: "/resignations",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
    ],
  },
  {
    id: "engagement",
    label: "Events & Engagement",
    icon: "calendar",
    roles: ["super_admin", "admin", "hr"],
    items: [
      {
        id: "events",
        label: "Events",
        icon: "calendar",
        path: "/events",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "announcements",
        label: "Announcements",
        icon: "bell",
        path: "/announcements",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
    ],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: "clock",
    items: [
      {
        id: "attendance-records",
        label: "Attendance Records",
        icon: "clock",
        path: "/attendance",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "regularization",
        label: "Regularization Requests",
        icon: "edit",
        path: "/regularization-requests",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "shifts",
        label: "Shifts",
        icon: "clock",
        path: "/shifts",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "geofence-zones",
        label: "Geofence Zones",
        icon: "globe",
        path: "/geofence-zones",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "device-sessions",
        label: "Device Sessions",
        icon: "activity",
        path: "/device-sessions",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "monitoring",
        label: "Monitoring",
        icon: "shield",
        path: "/monitoring",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "monitoring-policy",
        label: "Monitoring Policy",
        icon: "shield",
        path: "/monitoring-policy",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "onboarding-tasks",
        label: "Onboarding Tasks",
        icon: "list",
        path: "/onboarding-tasks",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
    ],
  },
  {
    id: "leave-management",
    label: "Leave Management",
    icon: "calendar",
    items: [
      {
        id: "leave-types",
        label: "Leave Types",
        icon: "list",
        path: "/leave-types",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "leave-requests",
        label: "Leave Requests",
        icon: "calendar",
        path: "/leave-requests",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "leave-balances",
        label: "Leave Balances",
        icon: "pieChart",
        path: "/leave-balances",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "holidays",
        label: "Holidays",
        icon: "sun",
        path: "/holidays",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
    ],
  },
  {
    id: "payroll",
    label: "Payroll",
    icon: "dollar",
    items: [
      {
        id: "salary-structures",
        label: "Salary Structures",
        icon: "dollar",
        path: "/salary-structures",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "payroll-records",
        label: "Payroll",
        icon: "card",
        path: "/payroll",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "advance-salaries",
        label: "Advance Salary",
        icon: "dollar",
        path: "/advance-salaries",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "time-logs",
        label: "Time Logs",
        icon: "clock",
        path: "/time-logs",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
      {
        id: "statutory-rules",
        label: "Statutory Rules",
        icon: "shield",
        path: "/statutory-rules",
        roles: ["super_admin", "admin"],
      },
      {
        id: "statutory-details",
        label: "Statutory Details",
        icon: "clipboard",
        path: "/statutory-details",
        roles: ["super_admin", "admin"],
      },
      {
        id: "currencies",
        label: "Currencies",
        icon: "globe",
        path: "/currencies",
        roles: ["super_admin", "admin"],
      },
    ],
  },
  {
    id: "hiring",
    label: "Hiring",
    icon: "userPlus",
    items: [
      {
        id: "job-postings",
        label: "Job Postings",
        icon: "userPlus",
        path: "/job-postings",
        roles: ["super_admin", "admin", "hr"],
      },
    ],
  },
  {
    id: "performance",
    label: "Performance",
    icon: "trending",
    items: [
      {
        id: "performance-reviews",
        label: "Performance Reviews",
        icon: "barChart",
        path: "/performance-reviews",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
    ],
  },
  {
    id: "assets",
    label: "Assets",
    icon: "briefcase",
    items: [
      {
        id: "asset-inventory",
        label: "Asset Inventory",
        icon: "briefcase",
        path: "/assets",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "asset-assignments",
        label: "Asset Assignments",
        icon: "userPlus",
        path: "/asset-assignments",
        roles: ["super_admin", "admin", "hr", "staff"],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: "barChart",
    items: [
      {
        id: "global-reports",
        label: "Global Reports",
        icon: "barChart",
        path: "/reports/global",
        roles: ["super_admin"],
      },
      {
        id: "company-reports",
        label: "Company Reports",
        icon: "trending",
        path: "/reports/companies",
        roles: ["super_admin", "admin", "hr"],
      },
      {
        id: "employee-reports",
        label: "Employee Reports",
        icon: "activity",
        path: "/reports/employees",
        roles: ["super_admin", "admin", "hr"],
      },
    ],
  },
];

const SUPPORT_ITEMS = [
  { id: "help", label: "Help & Support", icon: "headphones", path: "/help" },
  {
    id: "docs",
    label: "Documentation",
    icon: "fileText",
    path: "/documentation",
  },
];

/* ---------- component ---------- */

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getCurrentUser()?.role || "staff"; // fail-closed: unknown user gets the most restricted view

  const { companyName, logoFullUrl, loading: brandingLoading } = useBranding();

  const isSuperAdmin = role === "super_admin";
  const showLogo = !isSuperAdmin && !!logoFullUrl;
  const brandName = isSuperAdmin ? "SewaRo" : companyName || "SewaRo";
  const brandSub = isSuperAdmin
    ? "HR Management System"
    : companyName
      ? "HR Portal"
      : "HR Management System";

  const canSee = (roles) => !roles || roles.includes(role);

  const visibleTopItems = TOP_ITEMS.filter((item) => canSee(item.roles));
  const visibleGroups = MANAGEMENT_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((it) => canSee(it.roles)),
  })).filter((group) => group.items.length > 0);

  const [expanded, setExpanded] = useState(() => {
    const match = visibleGroups.find((g) =>
      g.items.some((it) => location.pathname.startsWith(it.path)),
    );
    return match ? { [match.id]: true } : {};
  });

  const toggleGroup = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const go = (path) => {
    if (!path) {
      console.error("Sidebar: nav item is missing a path", path);
      return;
    }
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        {/* ---------- brand / company logo ---------- */}
        <div className="sidebar-brand">
          {showLogo ? (
            <img
              src={logoFullUrl}
              alt={brandName}
              className="brand-logo"
              onError={(e) => {
                // If the image fails, hide it and reveal the fallback mark.
                e.currentTarget.style.display = "none";
                const sib = e.currentTarget.nextElementSibling;
                if (sib) sib.style.display = "grid";
              }}
            />
          ) : null}

          <div
            className="brand-mark"
            style={{ display: showLogo ? "none" : "grid" }}
          >
            <Icon name="hash" size={20} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div className="brand-name" title={brandName}>
              {brandingLoading && !isSuperAdmin ? "Loading…" : brandName}
            </div>
            <div className="brand-sub" title={brandSub}>
              {brandSub}
            </div>
          </div>
        </div>

        {/* ---------- nav ---------- */}
        <nav className="sidebar-nav">
          {visibleTopItems.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">
                {role === "super_admin" ? "SUPER ADMIN" : "OVERVIEW"}
              </div>
              {visibleTopItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={() => go(item.path)}
                  >
                    <Icon name={item.icon} size={17} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {visibleGroups.length > 0 && (
            <div className="nav-section">
              <div className="nav-section-title">MANAGEMENT</div>
              {visibleGroups.map((group) => {
                const isOpen = !!expanded[group.id];
                const hasActiveChild = group.items.some(
                  (it) => location.pathname === it.path,
                );

                return (
                  <div key={group.id}>
                    <button
                      className={`nav-item ${hasActiveChild ? "active" : ""}`}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <Icon name={group.icon} size={17} />
                      <span style={{ flex: 1, textAlign: "left" }}>
                        {group.label}
                      </span>
                      <Icon
                        name="chevronRight"
                        size={14}
                        style={{
                          transition: "transform 0.15s ease",
                          transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      />
                    </button>

                    {isOpen && (
                      <div style={{ paddingLeft: 30 }}>
                        {group.items.map((it) => {
                          const isActive = location.pathname === it.path;
                          return (
                            <button
                              key={it.id}
                              className={`nav-item ${isActive ? "active" : ""}`}
                              style={{ fontSize: 13.5, padding: "8px 10px" }}
                              onClick={() => go(it.path)}
                            >
                              <Icon name={it.icon} size={15} />
                              <span>{it.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="nav-section">
            <div className="nav-section-title">SUPPORT</div>
            {SUPPORT_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? "active" : ""}`}
                  onClick={() => go(item.path)}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* ---------- footer (unchanged) ---------- */}
        <div
          className="sidebar-footer"
          style={{
            background:
              "linear-gradient(135deg, var(--blue), var(--blue-dark))",
            borderRadius: 10,
            margin: "10px 14px 14px",
            padding: "12px 14px",
            color: "#fff",
          }}
        >
          <Icon name="crown" size={18} />
          <div>
            <div className="footer-name" style={{ color: "#fff" }}>
              {role === "super_admin"
                ? "Super Admin Access"
                : role === "admin"
                  ? "Admin Access"
                  : role === "hr"
                    ? "HR Access"
                    : "Staff Access"}
            </div>
            <div
              className="footer-tag"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {role === "super_admin"
                ? "Full access to all features"
                : "Access scoped to your company"}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
