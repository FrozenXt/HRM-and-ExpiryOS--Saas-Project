import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { FILE_BASE } from "../config";
import {
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
  uploadMyProfileImage,
} from "../services/userService";
import { getCurrentUser, currentUserId, saveUser, logout } from "../utils/auth";
import { useTheme } from "../context/ThemeContext";
import { useBranding } from "../context/BrandingContext";
import {
  applyBranding,
  applyEffectiveBranding,
  getPersonalPrefs,
  savePersonalPrefs,
  clearPersonalPrefs,
} from "../hooks/useBranding";

const inputStyle = { width: "100%", padding: "9px 12px" };
const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12.5,
  color: "var(--text-dim)",
};
const fieldWrap = { marginBottom: 14 };

// Keeps the cached user (used by the navbar) in sync and tells the navbar to refresh.
const syncCachedUser = (profile) => {
  const current = getCurrentUser() || {};
  saveUser({ ...current, ...profile, id: profile._id || current.id });
  window.dispatchEvent(new Event("user-updated"));
};

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [names, setNames] = useState({ firstName: "", lastName: "" });
  const [infoMsg, setInfoMsg] = useState({ type: "", text: "" });
  const [savingInfo, setSavingInfo] = useState(false);

  const [photoMsg, setPhotoMsg] = useState({ type: "", text: "" });
  const [uploading, setUploading] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState({ type: "", text: "" });
  const [savingPw, setSavingPw] = useState(false);

  // ----- personal appearance (only affects this user's own dashboard) -----
  const { theme, setPersonalTheme, clearPersonalTheme } = useTheme();
  const { settings: companySettings } = useBranding();
  const companyBrand = companySettings?.branding || {};
  const userId = currentUserId();
  const [look, setLook] = useState(() => {
    const p = getPersonalPrefs(currentUserId()) || {};
    return {
      primaryColor: p.primaryColor || "",
      secondaryColor: p.secondaryColor || "",
    };
  });
  const [lookMsg, setLookMsg] = useState({ type: "", text: "" });
  const shownPrimary =
    look.primaryColor || companyBrand.primaryColor || "#3b82f6";
  const shownSecondary =
    look.secondaryColor || companyBrand.secondaryColor || "#0ea5e9";

  const pickColor = (key) => (e) => {
    const next = { ...look, [key]: e.target.value };
    setLook(next);
    applyBranding(
      next.primaryColor || shownPrimary,
      next.secondaryColor || shownSecondary,
    ); // live preview, saved only when you press Save
  };

  const handleSaveLook = () => {
    savePersonalPrefs(userId, {
      primaryColor: shownPrimary,
      secondaryColor: shownSecondary,
    });
    setLook({ primaryColor: shownPrimary, secondaryColor: shownSecondary });
    applyBranding(shownPrimary, shownSecondary);
    setLookMsg({
      type: "success",
      text: "Saved. This only changes your own dashboard.",
    });
  };

  const handleResetLook = () => {
    clearPersonalPrefs(userId);
    clearPersonalTheme();
    setLook({ primaryColor: "", secondaryColor: "" });
    applyEffectiveBranding(companyBrand, userId);
    setLookMsg({
      type: "success",
      text: "Back to your company's default look.",
    });
  };

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        const p = res.data.data;
        setProfile(p);
        setNames({ firstName: p.firstName || "", lastName: p.lastName || "" });
      })
      .catch((err) =>
        setInfoMsg({
          type: "error",
          text: err.response?.data?.message || "Failed to load profile",
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  const errText = (err) =>
    err.response?.data?.message || err.message || "Something went wrong";

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoMsg({ type: "", text: "" });

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoMsg({
        type: "error",
        text: "Please select a JPG, PNG or WebP image.",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg({ type: "error", text: "Image must be smaller than 5MB." });
      return;
    }

    try {
      setUploading(true);
      const res = await uploadMyProfileImage(file);
      const updated = res.data.data;
      setProfile(updated);
      syncCachedUser(updated);
      setPhotoMsg({ type: "success", text: "Profile photo updated." });
    } catch (err) {
      setPhotoMsg({ type: "error", text: errText(err) });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setInfoMsg({ type: "", text: "" });
    if (!names.firstName.trim() || !names.lastName.trim()) {
      setInfoMsg({ type: "error", text: "First and last name are required." });
      return;
    }
    try {
      setSavingInfo(true);
      const res = await updateMyProfile(names);
      const updated = res.data.data;
      setProfile(updated);
      syncCachedUser(updated);
      setInfoMsg({ type: "success", text: "Profile updated." });
    } catch (err) {
      setInfoMsg({ type: "error", text: errText(err) });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: "", text: "" });

    if (!pw.current || !pw.next) {
      setPwMsg({ type: "error", text: "Fill in all password fields." });
      return;
    }
    if (pw.next.length < 8) {
      setPwMsg({
        type: "error",
        text: "New password must be at least 8 characters.",
      });
      return;
    }
    if (pw.next !== pw.confirm) {
      setPwMsg({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    try {
      setSavingPw(true);
      await changeMyPassword(pw.current, pw.next);
      // The server invalidated the old token, so sign in again.
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setPwMsg({ type: "error", text: errText(err) });
      setSavingPw(false);
    }
  };

  const Msg = ({ m }) =>
    m.text ? (
      <p
        style={{
          fontSize: 13,
          marginBottom: 12,
          color: m.type === "error" ? "var(--red)" : "var(--green, #10b981)",
        }}
      >
        {m.text}
      </p>
    ) : null;

  if (loading)
    return (
      <div className="muted" style={{ padding: 24 }}>
        Loading profile...
      </div>
    );
  if (!profile)
    return (
      <div style={{ color: "var(--red)", padding: 24 }}>{infoMsg.text}</div>
    );

  const initials =
    `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`.toUpperCase() ||
    "?";

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">My Profile</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>My Profile</h1>
          <p>Update your personal details, photo and password.</p>
        </div>
      </div>

      {/* PHOTO + INFO */}
      <section className="panel" style={{ maxWidth: 640, marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Personal Information</h2>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--bg-soft)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {profile.profileImage ? (
              <img
                src={`${FILE_BASE}${profile.profileImage}`}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhoto}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="btn"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading
                ? "Uploading..."
                : profile.profileImage
                  ? "Change Photo"
                  : "Upload Photo"}
            </button>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
              JPG, PNG or WebP · Maximum 5MB
            </div>
          </div>
        </div>
        <Msg m={photoMsg} />

        <form onSubmit={handleSaveInfo}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name *</label>
              <input
                className="search-box"
                style={inputStyle}
                value={names.firstName}
                onChange={(e) =>
                  setNames((n) => ({ ...n, firstName: e.target.value }))
                }
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last Name *</label>
              <input
                className="search-box"
                style={inputStyle}
                value={names.lastName}
                onChange={(e) =>
                  setNames((n) => ({ ...n, lastName: e.target.value }))
                }
              />
            </div>
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>Email</label>
            <input
              className="search-box"
              style={inputStyle}
              value={profile.email}
              disabled
            />
          </div>

          <Msg m={infoMsg} />
          <button type="submit" className="btn primary" disabled={savingInfo}>
            {savingInfo ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* APPEARANCE (personal) */}
      <section className="panel" style={{ maxWidth: 640, marginBottom: 20 }}>
        <div className="panel-head">
          <h2>Appearance</h2>
        </div>
        <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
          Your own colors and theme. They only change your dashboard, not other
          users and not your company's default.
        </p>

        <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Primary Color</label>
            <input
              type="color"
              value={shownPrimary}
              onChange={pickColor("primaryColor")}
              style={{ width: "100%", height: 38, padding: 2 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Secondary Color</label>
            <input
              type="color"
              value={shownSecondary}
              onChange={pickColor("secondaryColor")}
              style={{ width: "100%", height: 38, padding: 2 }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Theme</label>
            <select
              className="search-box"
              style={inputStyle}
              value={theme}
              onChange={(e) => setPersonalTheme(e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <Msg m={lookMsg} />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn primary"
            onClick={handleSaveLook}
          >
            Save my colors
          </button>
          <button type="button" className="btn" onClick={handleResetLook}>
            Reset to company default
          </button>
        </div>
      </section>

      {/* PASSWORD */}
      <section className="panel" style={{ maxWidth: 640 }}>
        <div className="panel-head">
          <h2>Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword}>
          <div style={fieldWrap}>
            <label style={labelStyle}>Current Password</label>
            <input
              type="password"
              className="search-box"
              style={inputStyle}
              value={pw.current}
              onChange={(e) =>
                setPw((p) => ({ ...p, current: e.target.value }))
              }
              autoComplete="current-password"
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>New Password</label>
            <input
              type="password"
              className="search-box"
              style={inputStyle}
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div style={fieldWrap}>
            <label style={labelStyle}>Confirm New Password</label>
            <input
              type="password"
              className="search-box"
              style={inputStyle}
              value={pw.confirm}
              onChange={(e) =>
                setPw((p) => ({ ...p, confirm: e.target.value }))
              }
              autoComplete="new-password"
            />
          </div>

          <Msg m={pwMsg} />
          <p className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
            You will be signed out after changing your password.
          </p>
          <button type="submit" className="btn primary" disabled={savingPw}>
            {savingPw ? "Updating..." : "Update Password"}
          </button>
        </form>
      </section>
    </>
  );
}
