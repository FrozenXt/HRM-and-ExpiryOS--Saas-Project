import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { getCurrentUser } from "../utils/auth";
import { getCompanies } from "../services/companyService";
import {
  getMonitoringPolicy,
  updateMonitoringPolicy,
} from "../services/monitoringPolicyService";

const COUNTRIES = [
  { code: "NP", label: "Nepal" },
  { code: "IN", label: "India" },
  { code: "US", label: "United States" },
  { code: "other", label: "Other" },
];

const emptyPolicy = {
  country: "NP",
  screenshotEnabled: false,
  screenshotIntervalMinutes: 5,
  locationTrackingEnabled: false,
  geofencingEnabled: false,
  activityTrackingEnabled: false,
  retentionDays: 90,
};

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

export default function MonitoringPolicy() {
  const role = getCurrentUser()?.role;
  const superAdmin = role === "super_admin";
  const allowed = role === "admin" || superAdmin;

  const [policy, setPolicy] = useState(emptyPolicy);
  const [loading, setLoading] = useState(!superAdmin);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(superAdmin);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");

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

  const loadPolicy = async (companyId) => {
    try {
      setLoading(true);
      setError("");
      const res = await getMonitoringPolicy(companyId);
      setPolicy((prev) => ({ ...prev, ...res.data.data }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!superAdmin) loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCompanyChange = (e) => {
    const id = e.target.value;
    setSelectedCompanyId(id);
    setPolicy(emptyPolicy);
    if (id) loadPolicy(id);
  };

  const set = (key) => (value) => setPolicy((p) => ({ ...p, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSavedNote(false);
      const payload = { ...policy };
      if (superAdmin) payload.companyId = selectedCompanyId;
      const res = await updateMonitoringPolicy(payload);
      setPolicy((prev) => ({ ...prev, ...res.data.data }));
      setSavedNote(true);
      setTimeout(() => setSavedNote(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!allowed) {
    return (
      <div className="muted" style={{ padding: "24px 0" }}>
        You don't have access to monitoring policy settings.
      </div>
    );
  }

  const waitingForCompanyPick = superAdmin && !selectedCompanyId;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Monitoring Policy</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Monitoring Policy</h1>
          <p>
            Company-wide master switches for device monitoring. Even with these
            on, each employee's own consent must also be given before any of
            their data is accepted.
          </p>
        </div>
      </div>

      {superAdmin && (
        <div className="settings-panel-card" style={{ marginBottom: 20 }}>
          <Field
            label="Company"
            hint="Select which company's monitoring policy you're managing."
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
            Choose a company above to view and edit its monitoring policy.
          </p>
        </div>
      ) : loading ? (
        <div className="muted" style={{ padding: "24px 0" }}>
          Loading monitoring policy...
        </div>
      ) : (
        <div className="settings-panel-card">
          <h2 className="settings-panel-title">Region & Retention</h2>
          <div className="settings-grid">
            <Field label="Country">
              <select
                value={policy.country}
                onChange={(e) => set("country")(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Retention Period (days)"
              hint="How long captured data is kept before it's purged."
            >
              <input
                type="number"
                min="1"
                value={policy.retentionDays}
                onChange={(e) => set("retentionDays")(Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="settings-divider" />

          <h2 className="settings-panel-title" style={{ fontSize: 14 }}>
            Monitoring Features
          </h2>

          <Toggle
            title="Screenshot Capture"
            desc="Periodically capture the employee's screen during an active session."
            checked={policy.screenshotEnabled}
            onChange={set("screenshotEnabled")}
          />
          {policy.screenshotEnabled && (
            <div style={{ padding: "0 0 14px 0", maxWidth: 260 }}>
              <Field label="Capture Interval (minutes)">
                <input
                  type="number"
                  min="1"
                  value={policy.screenshotIntervalMinutes}
                  onChange={(e) =>
                    set("screenshotIntervalMinutes")(Number(e.target.value))
                  }
                />
              </Field>
            </div>
          )}

          <Toggle
            title="Location Tracking"
            desc="Record the employee's device location during work sessions."
            checked={policy.locationTrackingEnabled}
            onChange={set("locationTrackingEnabled")}
          />
          <Toggle
            title="Geofencing"
            desc="Validate check-ins against defined geofence zones."
            checked={policy.geofencingEnabled}
            onChange={set("geofencingEnabled")}
          />
          <Toggle
            title="Activity Tracking"
            desc="Record active application/window names alongside captures."
            checked={policy.activityTrackingEnabled}
            onChange={set("activityTrackingEnabled")}
          />

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginTop: 18 }}>
              {error}
            </p>
          )}

          <div className="settings-footer">
            {savedNote && (
              <span className="settings-save-note">
                <Icon name="check" size={13} /> Policy saved
              </span>
            )}
            <button
              type="button"
              className="btn primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
