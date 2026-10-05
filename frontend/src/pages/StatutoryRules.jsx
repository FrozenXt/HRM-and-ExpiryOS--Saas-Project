import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { Row, Field, inputStyle } from "../components/FormParts";
import { isSuperAdmin, myCompanyId, getCurrentUser } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import {
  getCompanySettings,
  updateCompanySettings,
} from "../services/settingsService";
import {
  getStatutoryRates,
  setStatutoryRates,
  FALLBACK_RATES,
} from "../utils/statutoryRateDefaults";

const COUNTRY_OPTIONS = [
  { value: "NP", label: "Nepal" },
  { value: "IN", label: "India" },
  { value: "US", label: "United States" },
  { value: "other", label: "Other" },
];

const toggleRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 0",
  borderBottom: "1px solid var(--border)",
};

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label style={toggleRowStyle}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <div>
        <div style={{ fontSize: 14 }}>{label}</div>
        {hint && (
          <div className="muted" style={{ fontSize: 12 }}>
            {hint}
          </div>
        )}
      </div>
    </label>
  );
}

export default function StatutoryRules() {
  const superAdmin = isSuperAdmin();
  const role = getCurrentUser()?.role || "";
  const canEdit = superAdmin || role === "admin";

  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(superAdmin ? "" : myCompanyId());
  const [countrySettings, setCountrySettings] = useState({
    country: "NP",
    pfApplicable: false,
    esiApplicable: false,
    professionalTaxApplicable: false,
    tdsApplicable: true,
  });
  const [rates, setRates] = useState(FALLBACK_RATES);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedNote, setSavedNote] = useState("");

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [superAdmin]);

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    getCompanySettings(companyId)
      .then((res) => {
        if (cancelled) return;
        const settings = res.data.data;
        if (settings?.countrySettings) {
          setCountrySettings((cs) => ({ ...cs, ...settings.countrySettings }));
        }
        setRates(getStatutoryRates(companyId));
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const toggle = (key) => (e) =>
    setCountrySettings((cs) => ({ ...cs, [key]: e.target.checked }));
  const setRate = (key) => (e) =>
    setRates((r) => ({ ...r, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSavedNote("");

    const payload = { countrySettings };
    if (superAdmin) payload.companyId = companyId; // unverified shape — see note below

    try {
      setSaving(true);
      await updateCompanySettings(payload);
      setStatutoryRates(companyId, {
        pfEmployeeRate: Number(rates.pfEmployeeRate) || 0,
        pfEmployerRate: Number(rates.pfEmployerRate) || 0,
        gratuityRate: Number(rates.gratuityRate) || 0,
      });
      setSavedNote("Saved.");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Payroll</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Statutory Rules</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Statutory Rules</h1>
          <p>
            Configure which statutory deductions apply to this company and the
            default rates used when generating a deduction breakdown.
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="panel" style={{ padding: 20, marginBottom: 20 }}>
          <p className="muted" style={{ margin: 0 }}>
            Only Super Admin or company Admin can edit statutory rules.
          </p>
        </div>
      )}

      <section className="panel" style={{ padding: 24 }}>
        {superAdmin && (
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12.5,
                color: "var(--text-dim)",
              }}
            >
              Company *
            </label>
            <select
              className="search-box"
              style={inputStyle}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.legalName}
                </option>
              ))}
            </select>
          </div>
        )}

        {!companyId ? (
          <p className="muted">Select a company to view its statutory rules.</p>
        ) : loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div
              className="nav-section-title"
              style={{ padding: 0, margin: "0 0 10px" }}
            >
              Country & Applicability
            </div>
            <div style={{ marginBottom: 14, maxWidth: 260 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 12.5,
                  color: "var(--text-dim)",
                }}
              >
                Country
              </label>
              <select
                className="search-box"
                style={inputStyle}
                value={countrySettings.country}
                onChange={(e) =>
                  setCountrySettings((cs) => ({
                    ...cs,
                    country: e.target.value,
                  }))
                }
                disabled={!canEdit}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <Toggle
              checked={!!countrySettings.pfApplicable}
              onChange={toggle("pfApplicable")}
              label="Provident Fund (PF) applicable"
              hint="Shows PF employee/employer fields on the payroll deduction form."
            />
            <Toggle
              checked={!!countrySettings.esiApplicable}
              onChange={toggle("esiApplicable")}
              label="ESI applicable"
              hint="Shows ESI employee/employer fields on the payroll deduction form."
            />
            <Toggle
              checked={!!countrySettings.professionalTaxApplicable}
              onChange={toggle("professionalTaxApplicable")}
              label="Professional Tax applicable"
            />
            <Toggle
              checked={!!countrySettings.tdsApplicable}
              onChange={toggle("tdsApplicable")}
              label="TDS applicable"
              hint="Nepal income tax withholding — shown/estimated on payroll and salary structure forms."
            />

            <div
              className="nav-section-title"
              style={{ padding: 0, margin: "24px 0 10px" }}
            >
              Default Rates
            </div>
            <p
              className="muted"
              style={{ fontSize: 12, marginTop: -4, marginBottom: 14 }}
            >
              Used to pre-fill new payroll statutory deduction breakdowns. Saved
              to this browser only — see the note below.
            </p>
            <Row>
              <Field label="PF — Employee Contribution (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="search-box"
                  style={inputStyle}
                  value={rates.pfEmployeeRate}
                  onChange={setRate("pfEmployeeRate")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="PF — Employer Contribution (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="search-box"
                  style={inputStyle}
                  value={rates.pfEmployerRate}
                  onChange={setRate("pfEmployerRate")}
                  disabled={!canEdit}
                />
              </Field>
              <Field label="Gratuity Accrual (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className="search-box"
                  style={inputStyle}
                  value={rates.gratuityRate}
                  onChange={setRate("gratuityRate")}
                  disabled={!canEdit}
                />
              </Field>
            </Row>

            {error && (
              <p
                style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}
              >
                {error}
              </p>
            )}
            {savedNote && (
              <p
                style={{
                  color: "var(--green, #16a34a)",
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                {savedNote}
              </p>
            )}

            {canEdit && (
              <button type="submit" disabled={saving} className="btn primary">
                {saving ? "Saving..." : "Save Statutory Rules"}
              </button>
            )}
          </form>
        )}
      </section>

      {/* <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        Note: "Country & Applicability" is saved to your real backend via{" "}
        <code>PATCH /company-settings</code> — but I haven't seen that
        endpoint's exact update payload shape, so I'm sending{" "}
        <code>{"{ countrySettings: {...} }"}</code> (plus <code>companyId</code>{" "}
        for super admins). Confirm this matches your controller, or tell me the
        expected shape and I'll adjust. "Default Rates" has no backing field in
        your <code>CompanySettings</code> schema at all yet, so it's stored in
        this browser's localStorage — add <code>pfEmployeeRate</code> /{" "}
        <code>pfEmployerRate</code> / <code>gratuityRate</code> fields to the
        schema if you want it synced properly across your team.
      </p> */}
    </>
  );
}
