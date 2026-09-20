import React from "react";
import { Icon } from "./Icon";
import { useTheme } from "../context/ThemeContext";

const SunIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MoonIcon = () => (
  <svg
    width="19"
    height="19"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

export default function Navbar({ onToggleSidebar }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <button
        className="hamburger icon-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle menu"
      >
        <Icon name="list" size={20} />
      </button>

      <div className="search-box">
        <Icon name="search" size={16} />
        <input
          type="text"
          placeholder="Search companies, users, or anything..."
        />
        <span className="kbd">Ctrl + K</span>
      </div>

      <div className="topbar-right">
        <button
          className="icon-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          title={theme === "light" ? "Dark mode" : "Light mode"}
        >
          {theme === "light" ? <MoonIcon /> : <SunIcon />}
        </button>

        <button className="icon-btn" aria-label="Notifications">
          <Icon name="bell" size={19} />
          <span className="notif-dot">5</span>
        </button>

        <div className="profile">
          <div className="avatar">SA</div>
          <div className="profile-text">
            <div className="profile-name">Sujan Adhikari</div>
            <div className="profile-role">Super Admin</div>
          </div>
          <Icon name="chevronDown" size={14} />
        </div>
      </div>
    </header>
  );
}
