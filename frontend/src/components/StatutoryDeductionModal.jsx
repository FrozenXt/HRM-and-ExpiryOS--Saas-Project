import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle } from "./FormParts";
import { listOptions } from "../services/employeeService";
import { getCompanySettings } from "../services/settingsService";
import {
  getStatutoryDeductionForPayroll,
  createStatutoryDeduction,
  updateStatutoryDeduction,
} from "../services/payrollStatutoryDeductionService";
import { getStatutoryRates } from "../utils/statutoryRateDefaults";
import { calculateMonthlyTax } from "../utils/nepalTax";

const idOf = (v) => v?._id || v || "";

const emptyForm = {
  pfEmployeeContribution: "",
  pfEmployerContribution: "",
  esiEmployeeContribution: "",
  esiEmployerContribution: "",
  professionalTax: "",
  tds: "",
  gratuityAccrued: "",
  otherDeductions: "",
};

const readOnlyInputStyle = { ...inputStyle, background: "var(--surface-2)" };

export default function StatutoryDeductionModal({ payroll, onClose, onSaved }) {
  const [existingId, setExistingId] = useState(null);
  const [autoTds, setAutoTds] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState(null);
  const [computedGross, setComputedGross] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const companyId = idOf(payroll.companyId);
        const employeeId = idOf(payroll.employeeId);

        const [existing, companySettings, structures] = await Promise.all([
          getStatutoryDeductionForPayroll(payroll._id),
          getCompanySettings(companyId)
            .then((r) => r.data.data)
            .catch(() => null),
          listOptions("salary-structures", companyId).catch(() => []),
        ]);
        if (cancelled) return;

        setSettings(companySettings);
        const structure =
          structures.find((s) => idOf(s.employeeId) === employeeId) || null;

        if (existing) {
          setExistingId(existing._id);
          setForm({
            pfEmployeeContribution: existing.pfEmployeeContribution ?? "",
            pfEmployerContribution: existing.pfEmployerContribution ?? "",
            esiEmployeeContribution: existing.esiEmployeeContribution ?? "",
            esiEmployerContribution: existing.esiEmployerContribution ?? "",
            professionalTax: existing.professionalTax ?? "",
            tds: existing.tds ?? "",
            gratuityAccrued: existing.gratuityAccrued ?? "",
            otherDeductions: existing.otherDeductions ?? "",
          });
        } else {
          const basic = Number(structure?.basic) || 0;
          const allowanceTotal = (structure?.allowances || []).reduce(
            (n, a) => n + (a.amount || 0),
            0,
          );
          const grossSalary = basic + allowanceTotal;
          setComputedGross(grossSalary);
          const pfApplicable = companySettings?.countrySettings?.pfApplicable;
          const rates = getStatutoryRates(companyId);
          setForm({
            pfEmployeeContribution: pfApplicable
              ? Math.round(basic * (rates.pfEmployeeRate / 100))
              : 0,
            pfEmployerContribution: pfApplicable
              ? Math.round(basic * (rates.pfEmployerRate / 100))
              : 0,
            esiEmployeeContribution: 0,
            esiEmployerContribution: 0,
            professionalTax: 0,
            // Real Nepal slab calculation from this employee's gross — not copied
            // from payroll.deductions, which can include unrelated manual deductions.
            tds: calculateMonthlyTax(grossSalary),
            gratuityAccrued: Math.round(basic * (rates.gratuityRate / 100)),
            otherDeductions: 0,
          });
        }
        setAutoTds(!existing);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payroll._id]);

  const countrySettings = settings?.countrySettings || {};
  // Default to showing a field when settings haven't loaded / aren't set,
  // so nothing silently disappears before you know why.
  const showPf = countrySettings.pfApplicable !== false;
  const showEsi = !!countrySettings.esiApplicable;
  const showProfessionalTax =
    countrySettings.professionalTaxApplicable !== false;
  const showTds = countrySettings.tdsApplicable !== false;

  // What actually comes out of the employee's pay — employer PF/ESI
  // contributions and gratuity accrual are the company's cost, not the
  // employee's, so they're deliberately excluded from this total.
  const employeeDeductedTotal = useMemo(
    () =>
      [
        "pfEmployeeContribution",
        "esiEmployeeContribution",
        "professionalTax",
        "tds",
        "otherDeductions",
      ].reduce((n, k) => n + (Number(form[k]) || 0), 0),
    [form],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = {
      pfEmployeeContribution: Number(form.pfEmployeeContribution) || 0,
      pfEmployerContribution: Number(form.pfEmployerContribution) || 0,
      esiEmployeeContribution: Number(form.esiEmployeeContribution) || 0,
      esiEmployerContribution: Number(form.esiEmployerContribution) || 0,
      professionalTax: Number(form.professionalTax) || 0,
      tds: Number(form.tds) || 0,
      gratuityAccrued: Number(form.gratuityAccrued) || 0,
      otherDeductions: Number(form.otherDeductions) || 0,
    };
    if (!existingId) payload.payrollId = payroll._id;

    try {
      setSubmitting(true);
      const result = existingId
        ? await updateStatutoryDeduction(existingId, payload)
        : await createStatutoryDeduction(payload);
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const numberField = (key) => (
    <input
      type="number"
      min="0"
      className="search-box"
      style={inputStyle}
      value={form[key]}
      onChange={set(key)}
    />
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 560,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="dollar" size={16} /> {existingId ? "Edit" : "Add"}{" "}
            Statutory Deductions
          </h2>
          <button
            type="button"
            className="more-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon
              name="chevronRight"
              size={16}
              style={{ transform: "rotate(45deg)" }}
            />
          </button>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading...
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="muted" style={{ fontSize: 12.5, marginBottom: 14 }}>
              Breakdown for period <strong>{payroll.period}</strong>. Employer
              contributions and gratuity accrual are your company's cost — they
              aren't subtracted from the employee's take-home pay.
            </p>

            {showPf && (
              <Row>
                <Field label="PF — Employee Contribution">
                  {numberField("pfEmployeeContribution")}
                </Field>
                <Field label="PF — Employer Contribution">
                  {numberField("pfEmployerContribution")}
                </Field>
              </Row>
            )}
            {showEsi && (
              <Row>
                <Field label="ESI — Employee Contribution">
                  {numberField("esiEmployeeContribution")}
                </Field>
                <Field label="ESI — Employer Contribution">
                  {numberField("esiEmployerContribution")}
                </Field>
              </Row>
            )}
            <Row>
              {showProfessionalTax && (
                <Field label="Professional Tax">
                  {numberField("professionalTax")}
                </Field>
              )}
              {showTds && (
                <Field label="TDS (Nepal income tax slabs)">
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      className="search-box"
                      style={inputStyle}
                      value={form.tds}
                      onChange={(e) => {
                        setAutoTds(false);
                        setForm((f) => ({ ...f, tds: e.target.value }));
                      }}
                    />
                    {!autoTds && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setAutoTds(true);
                          setForm((f) => ({
                            ...f,
                            tds: calculateMonthlyTax(computedGross),
                          }));
                        }}
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </Field>
              )}
            </Row>
            <Row>
              <Field label="Gratuity Accrued">
                {numberField("gratuityAccrued")}
              </Field>
              <Field label="Other Deductions">
                {numberField("otherDeductions")}
              </Field>
            </Row>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 12.5,
                  color: "var(--text-dim)",
                }}
              >
                Total Deducted From Employee
              </label>
              <input
                className="search-box"
                style={readOnlyInputStyle}
                value={employeeDeductedTotal}
                readOnly
              />
            </div>

            {error && (
              <p
                style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <button type="button" onClick={onClose} className="btn">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn primary"
              >
                {submitting
                  ? "Saving..."
                  : existingId
                    ? "Save Changes"
                    : "Create Breakdown"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
