import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import { Icon } from "../components/Icon";
import "../pages/dashboard.css";
import "../styles/theme.css";
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="wp-app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <Navbar onToggleSidebar={() => setSidebarOpen((s) => !s)} />

        <main className="content">
          <Outlet />

          <footer className="wp-footer">
            <div className="footer-left">
              <div className="brand-mark small">
                <Icon name="hash" size={13} />
              </div>
              <div>
                <strong>WorkPulse</strong>{" "}
                <span className="muted">Advanced HR Management System</span>
              </div>
            </div>
            <div className="footer-right">
              <a href="#!">Privacy Policy</a>
              <a href="#!">Terms of Service</a>
              <a href="#!">Help &amp; Support</a>
              <span className="status-dot">
                <span className="dot online" /> All Systems Operational
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
