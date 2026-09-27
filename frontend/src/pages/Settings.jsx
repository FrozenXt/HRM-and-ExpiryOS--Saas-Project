// src/pages/Settings.jsx
import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { applyBranding, applyTheme } from "../hooks/useBranding";
import { useTheme } from "../context/ThemeContext";
import {
  getCompanySettings,
  updateCompanySettings,
} from "../services/settingsService";
import { getCompanies } from "../services/companyService";
import { uploadLogo, assetUrl } from "../services/uploadService";
import "../styles/settings.css";
import { isSuperAdmin, myCompanyId } from "../utils/auth"; // adjust path to wherever this file lives

const DAYS = [
  { key: "sun", label: "Sun" },
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
];

const COUNTRY_OPTIONS = [
  { code: "IN", label: "India" },
  { code: "NP", label: "Nepal" },
  { code: "US", label: "United States" },
  { code: "other", label: "Other" },
];

const emptySettings = {
  workingHours: { startTime: "09:00", endTime: "18:00", timezone: "" },
  weekOff: ["sun"],
  attendancePolicy: {
    fullDayMinHours: 8,
    halfDayMinHours: 4,
    lateMarkGraceMinutes: 10,
    autoMarkAbsentIfNoCheckIn: true,
  },
  financialYearStartMonth: 4,
  branding: {
    primaryColor: "#3b82f6",
    secondaryColor: "#0ea5e9",
    logoUrl: "",
    defaultTheme: "light",
  },
  mailSettings: {
    fromName: "",
    fromEmail: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    useTls: true,
  },
  countrySettings: {
    country: "NP",
    pfApplicable: false,
    esiApplicable: false,
    professionalTaxApplicable: false,
    tdsApplicable: false,
  },
  notifications: {
    documentExpiryReminders: true,
    leaveRequestAlerts: true,
    attendanceAlerts: true,
  },
};

const TABS = [
  { key: "general", label: "General", icon: "clock" },
  { key: "attendance", label: "Attendance Policy", icon: "check" },
  { key: "branding", label: "Branding", icon: "building" },
  { key: "mail", label: "Mail Settings", icon: "mail" },
  { key: "country", label: "Country & Compliance", icon: "globe" },
  { key: "notifications", label: "Notifications", icon: "bell" },
];

/* ---------- small reusable pieces ---------- */

const Field = ({ label, hint, children }) => (
  <div className="settings-field">
    <label>{label}</label>
    {children}
    {hint && <div className="settings-hint">{hint}</div>}
  </div>
);

const Toggle = ({ checked, onChange, title, desc }) => (
  <div className="toggle-row">
    <div className="toggle-row-text">
      <div className="toggle-title">{title}</div>
      {desc && <div className="toggle-desc">{desc}</div>}
    </div>
    <label className="switch">
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch-track" />
    </label>
  </div>
);

export default function Settings() {
  const superAdmin = isSuperAdmin();
  const { setThemeExplicit } = useTheme();

  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(!superAdmin); // super admin waits for a company pick
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Super admin only: list of companies for the dropdown + which one is selected.
  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(superAdmin);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

  // Load the company dropdown once, for super admin.
  useEffect(() => {
    if (!superAdmin) return;
    (async () => {
      try {
        setCompaniesLoading(true);
        const res = await getCompanies({
          page: 1,
          limit: 100,
          sort: "ASC",
          sort_field: "legalName",
          fields: [],
        });
        setCompanies(res.data.data.data);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
      } finally {
        setCompaniesLoading(false);
      }
    })();
  }, [superAdmin]);

  const loadSettings = async (companyId) => {
    try {
      setLoading(true);
      setError("");
      const res = await getCompanySettings(companyId);
      const data = res.data.data || {};
      setSettings((prev) => ({ ...prev, ...data }));

      const id = companyId || data.companyId || data._id || myCompanyId();
      if (id) localStorage.setItem("wp-current-company", id);

      const b = data.branding || {};
      if (b.primaryColor) {
        applyBranding(b.primaryColor, b.secondaryColor, id);
      }
      if (b.defaultTheme) {
        applyTheme(b.defaultTheme, id);
        setThemeExplicit(b.defaultTheme); // keep Navbar icon in sync
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Regular admin: load their own company's settings immediately.
  useEffect(() => {
    if (!superAdmin) loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Super admin: load settings whenever they pick a different company.
  const onCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompanyId(id);
    setSettings(emptySettings);
    if (id) loadSettings(id);
  };

  const update = (group, key, value) => {
    setSettings((s) => ({
      ...s,
      [group]: { ...s[group], [key]: value },
    }));
  };

  const toggleDay = (day) => {
    setSettings((s) => {
      const has = s.weekOff.includes(day);
      return {
        ...s,
        weekOff: has ? s.weekOff.filter((d) => d !== day) : [...s.weekOff, day],
      };
    });
  };

  const onLogoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }

    try {
      setError("");
      setUploading(true);
      const url = await uploadLogo(file);
      update("branding", "logoUrl", url);
    } catch (err) {
      setError(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSavedNote(false);

      const payload = { ...settings };
      if (superAdmin) payload.companyId = selectedCompanyId;

      const res = await updateCompanySettings(payload);
      setSettings((prev) => ({ ...prev, ...res.data.data }));

      const id =
        (superAdmin ? selectedCompanyId : myCompanyId()) ||
        res.data.data?.companyId ||
        res.data.data?._id;

      const b = res.data.data?.branding || settings.branding;
      if (b.primaryColor) {
        applyBranding(b.primaryColor, b.secondaryColor, id);
      }
      if (b.defaultTheme) {
        applyTheme(b.defaultTheme, id);
        setThemeExplicit(b.defaultTheme);
      }

      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // Super admin hasn't picked a company yet — nothing to edit.
  const waitingForCompanyPick = superAdmin && !selectedCompanyId;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Settings</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Company Settings</h1>
          <p>Configure working hours, attendance rules, branding and more.</p>
        </div>
      </div>

      {superAdmin && (
        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <Field
            label="Company"
            hint="Select which company's settings you're managing."
          >
            <select
              value={selectedCompanyId}
              onChange={onCompanyChange}
              disabled={companiesLoading}
              style={{ maxWidth: 360 }}
            >
              <option value="">
                {companiesLoading ? "Loading companies..." : "Select a company"}
              </option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.legalName}
                  {c.tradeName ? ` (${c.tradeName})` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {waitingForCompanyPick ? (
        <div className="settings-panel-card">
          <p className="muted" style={{ margin: 0 }}>
            Choose a company above to view and edit its settings.
          </p>
        </div>
      ) : loading ? (
        <div className="muted" style={{ padding: "24px 0" }}>
          Loading settings...
        </div>
      ) : (
        <div className="settings-layout">
          <nav className="settings-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`settings-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                <Icon name={t.icon} size={15} className="tab-icon" />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            <div className="settings-panel-card">
              {/* ---------------- GENERAL ---------------- */}
              {activeTab === "general" && (
                <>
                  <h2 className="settings-panel-title">
                    Working Hours & Calendar
                  </h2>
                  <p className="settings-panel-desc">
                    Standard office hours, weekly off days and the financial
                    year start month.
                  </p>

                  <div className="settings-grid">
                    <Field label="Start Time">
                      <input
                        type="time"
                        value={settings.workingHours.startTime}
                        onChange={(e) =>
                          update("workingHours", "startTime", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="End Time">
                      <input
                        type="time"
                        value={settings.workingHours.endTime}
                        onChange={(e) =>
                          update("workingHours", "endTime", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Timezone" hint="e.g. Asia/Kathmandu">
                      <input
                        type="text"
                        value={settings.workingHours.timezone}
                        onChange={(e) =>
                          update("workingHours", "timezone", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="Financial Year Start Month">
                      <select
                        value={settings.financialYearStartMonth}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            financialYearStartMonth: Number(e.target.value),
                          }))
                        }
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(
                          (m) => (
                            <option key={m} value={m}>
                              {new Date(2000, m - 1).toLocaleString("en-US", {
                                month: "long",
                              })}
                            </option>
                          ),
                        )}
                      </select>
                    </Field>
                  </div>

                  <div className="settings-divider" />

                  <Field label="Weekly Off Days">
                    <div className="day-pills">
                      {DAYS.map((d) => (
                        <span
                          key={d.key}
                          className={`day-pill ${
                            settings.weekOff.includes(d.key) ? "selected" : ""
                          }`}
                          onClick={() => toggleDay(d.key)}
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </Field>
                </>
              )}

              {/* ---------------- ATTENDANCE POLICY ---------------- */}
              {activeTab === "attendance" && (
                <>
                  <h2 className="settings-panel-title">Attendance Policy</h2>
                  <p className="settings-panel-desc">
                    Minimum hours and grace periods used to compute daily
                    attendance status.
                  </p>

                  <div className="settings-grid">
                    <Field label="Full Day — Minimum Hours">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={settings.attendancePolicy.fullDayMinHours}
                        onChange={(e) =>
                          update(
                            "attendancePolicy",
                            "fullDayMinHours",
                            Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                    <Field label="Half Day — Minimum Hours">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={settings.attendancePolicy.halfDayMinHours}
                        onChange={(e) =>
                          update(
                            "attendancePolicy",
                            "halfDayMinHours",
                            Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                    <Field label="Late Mark Grace (minutes)">
                      <input
                        type="number"
                        min="0"
                        value={settings.attendancePolicy.lateMarkGraceMinutes}
                        onChange={(e) =>
                          update(
                            "attendancePolicy",
                            "lateMarkGraceMinutes",
                            Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                  </div>

                  <div className="settings-divider" />

                  <Toggle
                    title="Auto-mark absent if no check-in"
                    desc="Employees with no check-in by end of day are automatically marked absent."
                    checked={
                      settings.attendancePolicy.autoMarkAbsentIfNoCheckIn
                    }
                    onChange={(v) =>
                      update("attendancePolicy", "autoMarkAbsentIfNoCheckIn", v)
                    }
                  />
                </>
              )}

              {/* ---------------- BRANDING ---------------- */}
              {activeTab === "branding" && (
                <>
                  <h2 className="settings-panel-title">Branding</h2>
                  <p className="settings-panel-desc">
                    Logo and theme colors shown across the portal for this
                    company.
                  </p>

                  <div className="logo-upload-row">
                    <div className="logo-preview">
                      {settings.branding.logoUrl ? (
                        <img
                          src={assetUrl(settings.branding.logoUrl)}
                          alt="Company logo"
                        />
                      ) : (
                        <Icon name="building" size={22} />
                      )}
                    </div>
                    <div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <label
                          className="btn btn-sm"
                          style={{ cursor: uploading ? "wait" : "pointer" }}
                        >
                          {uploading
                            ? "Uploading..."
                            : settings.branding.logoUrl
                              ? "Change logo"
                              : "Upload logo"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={onLogoPick}
                            disabled={uploading}
                            hidden
                          />
                        </label>
                        {settings.branding.logoUrl && (
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            onClick={() => update("branding", "logoUrl", "")}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div
                        className="muted"
                        style={{ fontSize: 12, marginTop: 6 }}
                      >
                        PNG, JPG or WEBP, up to 2 MB.
                      </div>
                    </div>
                  </div>

                  <div className="settings-grid">
                    <Field label="Primary Color">
                      <div className="color-field">
                        <input
                          type="color"
                          value={settings.branding.primaryColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            update("branding", "primaryColor", v);
                            applyBranding(
                              v,
                              settings.branding.secondaryColor,
                              superAdmin ? selectedCompanyId : myCompanyId(),
                            ); // live preview
                          }}
                        />
                        <input
                          type="text"
                          value={settings.branding.primaryColor}
                          onChange={(e) =>
                            update("branding", "primaryColor", e.target.value)
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Secondary Color">
                      <div className="color-field">
                        <input
                          type="color"
                          value={settings.branding.secondaryColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            update("branding", "secondaryColor", v);
                            applyBranding(settings.branding.primaryColor, v); // live preview
                          }}
                        />
                        <input
                          type="text"
                          value={settings.branding.secondaryColor}
                          onChange={(e) =>
                            update("branding", "secondaryColor", e.target.value)
                          }
                        />
                      </div>
                    </Field>
                    <Field label="Default Theme">
                      <select
                        value={settings.branding.defaultTheme}
                        onChange={(e) => {
                          const v = e.target.value;
                          update("branding", "defaultTheme", v);
                          setThemeExplicit(v);
                          applyTheme(
                            v,
                            superAdmin ? selectedCompanyId : myCompanyId(),
                          ); // live preview
                          applyBranding(
                            // keep soft tint in sync
                            settings.branding.primaryColor,
                            settings.branding.secondaryColor,
                          );
                        }}
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                      </select>
                    </Field>
                  </div>
                </>
              )}

              {/* ---------------- MAIL SETTINGS ---------------- */}
              {activeTab === "mail" && (
                <>
                  <h2 className="settings-panel-title">Mail Settings</h2>
                  <p className="settings-panel-desc">
                    SMTP configuration used to send notification and reminder
                    emails.
                  </p>

                  <div className="settings-grid">
                    <Field label="From Name">
                      <input
                        type="text"
                        value={settings.mailSettings.fromName}
                        onChange={(e) =>
                          update("mailSettings", "fromName", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="From Email">
                      <input
                        type="email"
                        value={settings.mailSettings.fromEmail}
                        onChange={(e) =>
                          update("mailSettings", "fromEmail", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="SMTP Host">
                      <input
                        type="text"
                        value={settings.mailSettings.smtpHost}
                        onChange={(e) =>
                          update("mailSettings", "smtpHost", e.target.value)
                        }
                      />
                    </Field>
                    <Field label="SMTP Port">
                      <input
                        type="number"
                        value={settings.mailSettings.smtpPort}
                        onChange={(e) =>
                          update(
                            "mailSettings",
                            "smtpPort",
                            Number(e.target.value),
                          )
                        }
                      />
                    </Field>
                    <Field label="SMTP Username">
                      <input
                        type="text"
                        value={settings.mailSettings.smtpUsername}
                        onChange={(e) =>
                          update("mailSettings", "smtpUsername", e.target.value)
                        }
                      />
                    </Field>
                    <Field
                      label="SMTP Password"
                      hint="Leave blank to keep the existing password"
                    >
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={settings.mailSettings.smtpPassword || ""}
                        onChange={(e) =>
                          update("mailSettings", "smtpPassword", e.target.value)
                        }
                      />
                    </Field>
                  </div>

                  <div className="settings-divider" />

                  <Toggle
                    title="Use TLS"
                    desc="Enable STARTTLS for outbound SMTP connections."
                    checked={settings.mailSettings.useTls}
                    onChange={(v) => update("mailSettings", "useTls", v)}
                  />
                </>
              )}

              {/* ---------------- COUNTRY & COMPLIANCE ---------------- */}
              {activeTab === "country" && (
                <>
                  <h2 className="settings-panel-title">Country & Compliance</h2>
                  <p className="settings-panel-desc">
                    Statutory modules applicable to this company's country.
                  </p>

                  <div className="settings-grid single">
                    <Field label="Country">
                      <select
                        value={settings.countrySettings.country}
                        onChange={(e) =>
                          update("countrySettings", "country", e.target.value)
                        }
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="settings-divider" />

                  <Toggle
                    title="PF Applicable"
                    desc="Provident Fund contributions apply to this company."
                    checked={settings.countrySettings.pfApplicable}
                    onChange={(v) =>
                      update("countrySettings", "pfApplicable", v)
                    }
                  />
                  <Toggle
                    title="ESI Applicable"
                    desc="Employee State Insurance contributions apply."
                    checked={settings.countrySettings.esiApplicable}
                    onChange={(v) =>
                      update("countrySettings", "esiApplicable", v)
                    }
                  />
                  <Toggle
                    title="Professional Tax Applicable"
                    desc="State-level professional tax deduction applies."
                    checked={settings.countrySettings.professionalTaxApplicable}
                    onChange={(v) =>
                      update("countrySettings", "professionalTaxApplicable", v)
                    }
                  />
                  <Toggle
                    title="TDS Applicable"
                    desc="Tax deducted at source applies to payroll."
                    checked={settings.countrySettings.tdsApplicable}
                    onChange={(v) =>
                      update("countrySettings", "tdsApplicable", v)
                    }
                  />
                </>
              )}

              {/* ---------------- NOTIFICATIONS ---------------- */}
              {activeTab === "notifications" && (
                <>
                  <h2 className="settings-panel-title">Notifications</h2>
                  <p className="settings-panel-desc">
                    Choose which automatic alerts this company sends out.
                  </p>

                  <Toggle
                    title="Document Expiry Reminders"
                    desc="Notify when employee or company documents are nearing expiry."
                    checked={settings.notifications.documentExpiryReminders}
                    onChange={(v) =>
                      update("notifications", "documentExpiryReminders", v)
                    }
                  />
                  <Toggle
                    title="Leave Request Alerts"
                    desc="Notify approvers when a new leave request is submitted."
                    checked={settings.notifications.leaveRequestAlerts}
                    onChange={(v) =>
                      update("notifications", "leaveRequestAlerts", v)
                    }
                  />
                  <Toggle
                    title="Attendance Alerts"
                    desc="Notify on missed check-ins or unusual attendance patterns."
                    checked={settings.notifications.attendanceAlerts}
                    onChange={(v) =>
                      update("notifications", "attendanceAlerts", v)
                    }
                  />
                </>
              )}

              {error && (
                <p style={{ color: "var(--red)", fontSize: 13, marginTop: 18 }}>
                  {error}
                </p>
              )}

              <div className="settings-footer">
                {savedNote && (
                  <span className="settings-save-note">
                    <Icon name="check" size={13} /> Settings saved
                  </span>
                )}
                <button
                  type="button"
                  className="btn primary"
                  disabled={saving || uploading}
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
