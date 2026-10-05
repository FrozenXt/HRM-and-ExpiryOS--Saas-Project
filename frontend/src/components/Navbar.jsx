import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";
import { FILE_BASE } from "../config";
import { getMyProfile } from "../services/userService";
import {
  getCurrentUser,
  saveUser,
  logout,
  displayName,
  displayInitials,
  roleLabel,
} from "../utils/auth";

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

// Shows the profile photo if there is one, otherwise the initials.
function UserAvatar({ user, size }) {
  const style = {
    overflow: "hidden",
    ...(size ? { width: size, height: size } : {}),
  };

  return (
    <div className="avatar" style={style}>
      {user?.profileImage ? (
        <img
          src={`${FILE_BASE}${user.profileImage}`}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ) : (
        displayInitials(user)
      )}
    </div>
  );
}

export default function Navbar({ onToggleSidebar }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getCurrentUser());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Load the full profile once on mount so profileImage and the name are
  // always present, even if login cached the user without them.
  //
  // This used to call fetchCurrentUserProfile(id) -> GET /users/:id, the
  // admin "look up any user" endpoint. For staff/hr that route is
  // role-restricted, so the request 403'd and was swallowed by the catch
  // below — meaning non-admin roles never picked up their saved name/photo
  // here. GET /users/me (via getMyProfile) is the self endpoint every role
  // can call, and it's what Profile.js already uses to save.
  useEffect(() => {
    const id = getCurrentUser()?.id;
    if (!id) return;

    getMyProfile()
      .then((res) => {
        const profile = res.data.data;
        const full = {
          ...getCurrentUser(),
          ...profile,
          id: profile._id || id,
        };
        saveUser(full);
        setUser(full);
      })
      .catch(() => {
        /* keep showing the cached user / email fallback */
      });
  }, []);

  // The My Profile page dispatches "user-updated" after saving a change.
  useEffect(() => {
    const refresh = () => setUser(getCurrentUser());
    window.addEventListener("user-updated", refresh);
    return () => window.removeEventListener("user-updated", refresh);
  }, []);

  // Close the menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;

    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);

    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  const goToProfile = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

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

        <NotificationBell />

        <div className="profile-wrap" ref={menuRef}>
          <button
            type="button"
            className="profile"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <UserAvatar user={user} />
            <div className="profile-text">
              <div className="profile-name">{displayName(user)}</div>
              <div className="profile-role">{roleLabel(user?.role)}</div>
            </div>
            <Icon name="chevronDown" size={14} />
          </button>

          {menuOpen && (
            <div className="profile-menu" role="menu">
              <div className="profile-menu-head">
                <div className="profile-name">{displayName(user)}</div>
                {user?.email && (
                  <div className="profile-role">{user.email}</div>
                )}
                <span className="badge plan-business" style={{ marginTop: 8 }}>
                  {roleLabel(user?.role)}
                </span>
              </div>

              <button
                type="button"
                className="profile-menu-item"
                onClick={goToProfile}
                role="menuitem"
              >
                <Icon name="users" size={14} /> My Profile
              </button>

              <button
                type="button"
                className="profile-menu-item danger"
                onClick={handleLogout}
                role="menuitem"
              >
                <Icon name="chevronLeft" size={14} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
