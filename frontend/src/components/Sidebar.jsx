import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

// Flat items shown directly under the "SUPER ADMIN" label.
const TOP_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid", path: "/dashboard" },
  { id: "companies", label: "Companies", icon: "building", path: "/companies" },
  { id: "users", label: "Users", icon: "users", path: "/users" },
  { id: "plans", label: "Plans & Subscriptions", icon: "list", path: "/plans" },
  {
    id: "system-settings",
    label: "System Settings",
    icon: "settings",
    path: "/system-settings",
  },
];

// Collapsible groups shown under "MANAGEMENT" — each maps to modules you've
// already built on the backend.
const MANAGEMENT_GROUPS = [
  {
    id: "hr-management",
    label: "HR Management",
    icon: "briefcase",
    items: [
      { id: "departments", label: "Departments", path: "/departments" },
      { id: "designations", label: "Designations", path: "/designations" },
      {
        id: "document-types",
        label: "Document Types",
        path: "/document-types",
      },
      {
        id: "company-documents",
        label: "Company Documents",
        path: "/company-documents",
      },
      { id: "employees", label: "Employees", path: "/employees" },
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
        path: "/attendance",
      },
      {
        id: "regularization",
        label: "Regularization Requests",
        path: "/regularization-requests",
      },
    ],
  },
  {
    id: "leave-management",
    label: "Leave Management",
    icon: "calendar",
    items: [
      { id: "leave-types", label: "Leave Types", path: "/leave-types" },
      {
        id: "leave-requests",
        label: "Leave Requests",
        path: "/leave-requests",
      },
      {
        id: "leave-balances",
        label: "Leave Balances",
        path: "/leave-balances",
      },
      { id: "holidays", label: "Holidays", path: "/holidays" },
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
        path: "/salary-structures",
      },
      { id: "payroll-records", label: "Payroll", path: "/payroll" },
      { id: "time-logs", label: "Time Logs", path: "/time-logs" },
      {
        id: "statutory-rules",
        label: "Statutory Rules",
        path: "/statutory-rules",
      },
      { id: "currencies", label: "Currencies", path: "/currencies" },
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
        path: "/reports/global",
      },
      {
        id: "company-reports",
        label: "Company Reports",
        path: "/reports/companies",
      },
      {
        id: "employee-reports",
        label: "Employee Reports",
        path: "/reports/employees",
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

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-expand whichever group contains the current route.
  const [expanded, setExpanded] = useState(() => {
    const match = MANAGEMENT_GROUPS.find((g) =>
      g.items.some((it) => location.pathname.startsWith(it.path)),
    );
    return match ? { [match.id]: true } : {};
  });

  const toggleGroup = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const go = (path) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">
            <Icon name="hash" size={20} />
          </div>
          <div>
            <div className="brand-name">WorkPulse</div>
            <div className="brand-sub">HR Management System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">SUPER ADMIN</div>
            {TOP_ITEMS.map((item) => {
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

          <div className="nav-section">
            <div className="nav-section-title">MANAGEMENT</div>
            {MANAGEMENT_GROUPS.map((group) => {
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
              Super Admin Access
            </div>
            <div
              className="footer-tag"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Full access to all features
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
