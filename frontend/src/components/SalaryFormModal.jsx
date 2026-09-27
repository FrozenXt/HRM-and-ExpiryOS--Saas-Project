import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { getCompanySettings } from "../services/settingsService";
import {
  standardMonthlyHours,
  dailyWorkingHours,
  workingDaysInMonth,
} from "../utils/companyHours";
import { listOptions } from "../services/employeeService";
import {
  createSalaryStructure,
  updateSalaryStructure,
} from "../services/salaryService";
import { calculateMonthlyTax } from "../utils/nepalTax";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

// Confirm these against your backend's validation enums if they differ.
const WAGE_TYPES = ["monthly", "hourly", "daily"];
const PAY_FREQUENCIES = ["weekly", "biweekly", "monthly"];

// Names used to tag the two auto-computed line items so they can be told
// apart from any extra custom allowances/deductions an admin adds by hand.
// (Simplification: if someone names a manual allowance exactly "Allowance",
// it'll be treated as the auto one when re-opening this structure to edit.)
const AUTO_ALLOWANCE_NAME = "Allowance";
const AUTO_TAX_NAME = "Income Tax (TDS)";

const emptyForm = {
  companyId: "",
  employeeId: "",
  currencyId: "",
  wageType: "monthly",
  payFrequency: "monthly",
  basic: "",
  hourlyRate: "",
  dailyRate: "",
  overtimeRateMultiplier: "1.5",
};

const emptyLine = () => ({ name: "", amount: "" });

const lineListStyle = { display: "flex", flexDirection: "column", gap: 8 };
const lineRowStyle = { display: "flex", gap: 8, alignItems: "center" };
const readOnlyInputStyle = { ...inputStyle, background: "var(--surface-2)" };

function LineItemEditor({ title, lines, setLines }) {
  const update = (i, key, value) =>
    setLines((rows) =>
      rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)),
    );
  const remove = (i) => setLines((rows) => rows.filter((_, idx) => idx !== i));
  const add = () => setLines((rows) => [...rows, emptyLine()]);

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <label style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
          {title}
        </label>
        <button type="button" className="btn btn-sm" onClick={add}>
          <Icon name="plusCircle" size={13} /> Add
        </button>
      </div>
      {lines.length === 0 && (
        <div className="muted" style={{ fontSize: 12.5 }}>
          None added.
        </div>
      )}
      <div style={lineListStyle}>
        {lines.map((line, i) => (
          <div key={i} style={lineRowStyle}>
            <input
              className="search-box"
              style={{ ...inputStyle, flex: 2 }}
              placeholder="Name (e.g. Transport)"
              value={line.name}
              onChange={(e) => update(i, "name", e.target.value)}
            />
            <input
              type="number"
              min="0"
              className="search-box"
              style={{ ...inputStyle, flex: 1 }}
              placeholder="Amount"
              value={line.amount}
              onChange={(e) => update(i, "amount", e.target.value)}
            />
            <button
              type="button"
              className="more-btn"
              aria-label={`Remove ${title.toLowerCase()} row`}
              onClick={() => remove(i)}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalaryFormModal({
  mode = "create",
  structure,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin(); // company admins never pick a company

  // Pull the previously-saved auto lines back out (if any) so editing an
  // existing structure doesn't show them twice — once as the computed
  // breakdown, once as an "extra" line item.
  const existingAllowanceLine = structure?.allowances?.find(
    (a) => a.name === AUTO_ALLOWANCE_NAME,
  );
  const existingTaxLine = structure?.deductions?.find(
    (d) => d.name === AUTO_TAX_NAME,
  );
  const existingExtraAllowances = (structure?.allowances || []).filter(
    (a) => a.name !== AUTO_ALLOWANCE_NAME,
  );
  const existingExtraDeductions = (structure?.deductions || []).filter(
    (d) => d.name !== AUTO_TAX_NAME,
  );

  const [form, setForm] = useState(() => {
    if (!isEdit || !structure)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(structure.companyId),
      employeeId: idOf(structure.employeeId),
      currencyId: idOf(structure.currencyId),
      wageType: structure.wageType || "monthly",
      payFrequency: structure.payFrequency || "monthly",
      basic: structure.basic ?? "",
      hourlyRate: structure.hourlyRate ?? "",
      dailyRate: structure.dailyRate ?? "",
      overtimeRateMultiplier: structure.overtimeRateMultiplier ?? "1.5",
    };
  });

  // Gross Salary is a convenience input, not a field the API stores — it
  // just drives the Allowance (Gross − Basic) and tax auto-calculations.
  const [grossSalary, setGrossSalary] = useState(() => {
    if (!isEdit || !structure) return "";
    const basic = Number(structure.basic) || 0;
    const allowanceAmt =
      existingAllowanceLine?.amount ??
      (structure.allowances || []).reduce((n, a) => n + (a.amount || 0), 0);
    return basic + allowanceAmt || "";
  });

  const [autoTax, setAutoTax] = useState(!isEdit);
  const [taxOverride, setTaxOverride] = useState(
    existingTaxLine ? String(existingTaxLine.amount) : "",
  );
  // Hourly wage type only — company settings drive the "Auto" hours figure.
  const [companySettings, setCompanySettings] = useState(null);
  const [autoHours, setAutoHours] = useState(true);
  const [hoursOverride, setHoursOverride] = useState("");

  const [allowances, setAllowances] = useState(() =>
    isEdit ? existingExtraAllowances : [],
  );
  const [deductions, setDeductions] = useState(() =>
    isEdit ? existingExtraDeductions : [],
  );

  const [companies, setCompanies] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lookups, setLookups] = useState({
    users: [],
    employees: [],
    structures: [],
  });
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Companies for the first dropdown (super admin only, loaded once).
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  // Currencies are global — not scoped to a company — so load once.
  useEffect(() => {
    listOptions("currencies")
      .then(setCurrencies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  // Employees depend on the chosen company (super admin) or on the logged-in
  // admin's own company. We also pull existing salary structures for that
  // same scope so we can hide employees who already have one — the API
  // enforces "one structure per employee" and fails otherwise.
  const ready = superAdmin ? !!form.companyId : true;
  const scopeId = superAdmin ? form.companyId : undefined;

  useEffect(() => {
    if (!ready) {
      setLookups({ users: [], employees: [], structures: [] });
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("users", scopeId),
      listOptions("employees", scopeId),
      listOptions("salary-structures", scopeId),
    ])
      .then(([users, employees, structures]) => {
        if (!cancelled) setLookups({ users, employees, structures });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => !cancelled && setLoadingLookups(false));
    return () => {
      cancelled = true;
    };
  }, [form.companyId]);

  // Company's working-hours settings — only needed for hourly wage type, to
  // convert Gross Salary into an hourly rate.
  useEffect(() => {
    if (form.wageType !== "hourly" || !ready) return;
    let cancelled = false;
    getCompanySettings(scopeId)
      .then((res) => {
        if (!cancelled) setCompanySettings(res.data.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [form.wageType, ready, scopeId]);

  const onCompanyChange = (e) =>
    setForm((f) => ({
      ...f,
      companyId: e.target.value,
      employeeId: "",
    }));

  const usersById = useMemo(
    () => Object.fromEntries(lookups.users.map((u) => [u._id, u])),
    [lookups.users],
  );

  // Employees that don't have a salary structure yet (keep the current
  // employee when editing, since this structure already belongs to them).
  const availableEmployees = useMemo(() => {
    const taken = new Set(
      lookups.structures.map((s) => String(idOf(s.employeeId))),
    );
    return lookups.employees.filter(
      (e) => e._id === form.employeeId || !taken.has(String(e._id)),
    );
  }, [lookups, form.employeeId]);

  // --- Nepal salary breakdown (monthly wage type only) ---------------------
  const isMonthly = form.wageType === "monthly";
  const isHourly = form.wageType === "hourly";
  const showBreakdown = isMonthly || isHourly; // both use Gross → Allowance/Tax/Net

  const autoMonthlyHours = useMemo(
    () => (companySettings ? standardMonthlyHours(companySettings) : 0),
    [companySettings],
  );

  const effectiveMonthlyHours = autoHours
    ? autoMonthlyHours
    : Number(hoursOverride) || 0;

  const computedHourlyRate = useMemo(() => {
    if (!isHourly || !effectiveMonthlyHours) return 0;
    return (
      Math.round(((Number(grossSalary) || 0) / effectiveMonthlyHours) * 100) /
      100
    );
  }, [isHourly, grossSalary, effectiveMonthlyHours]);

  // Keep form.hourlyRate (what actually gets submitted) synced to the computed value.
  useEffect(() => {
    if (!isHourly) return;
    setForm((f) => ({ ...f, hourlyRate: computedHourlyRate || "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHourly, computedHourlyRate]);

  const computedAllowance = useMemo(() => {
    const gross = Number(grossSalary) || 0;
    const basic = Number(form.basic) || 0;
    return Math.max(0, Math.round((gross - basic) * 100) / 100);
  }, [grossSalary, form.basic]);

  const computedMonthlyTax = useMemo(
    () => calculateMonthlyTax(Number(grossSalary) || 0),
    [grossSalary],
  );

  const taxAmount = autoTax ? computedMonthlyTax : Number(taxOverride) || 0;

  const extraAllowanceTotal = allowances.reduce(
    (n, a) => n + (Number(a.amount) || 0),
    0,
  );
  const extraDeductionTotal = deductions.reduce(
    (n, d) => n + (Number(d.amount) || 0),
    0,
  );

  const netPay = useMemo(() => {
    const gross = Number(grossSalary) || 0;
    return (
      Math.round(
        (gross + extraAllowanceTotal - taxAmount - extraDeductionTotal) * 100,
      ) / 100
    );
  }, [grossSalary, extraAllowanceTotal, taxAmount, extraDeductionTotal]);
  // --------------------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.employeeId ||
      !form.currencyId ||
      !form.wageType ||
      !form.payFrequency ||
      form.basic === ""
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }
    if (isHourly && (!form.hourlyRate || Number(form.hourlyRate) <= 0)) {
      setError(
        "Couldn't compute an hourly rate — check Gross Salary and Working Hours.",
      );
      return;
    }
    if (form.wageType === "daily" && form.dailyRate === "") {
      setError("Daily rate is required for daily wage type.");
      return;
    }
    if (showBreakdown) {
      if (grossSalary === "" || Number(grossSalary) <= 0) {
        setError("Enter a gross salary.");
        return;
      }
      if (Number(form.basic) > Number(grossSalary)) {
        setError("Basic salary can't be more than gross salary.");
        return;
      }
    }

    const cleanLines = (rows) =>
      rows
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), amount: Number(r.amount) || 0 }));

    let allowancesPayload = cleanLines(allowances);
    let deductionsPayload = cleanLines(deductions);
    if (showBreakdown) {
      allowancesPayload = [
        { name: AUTO_ALLOWANCE_NAME, amount: computedAllowance },
        ...allowancesPayload,
      ];
      deductionsPayload = [
        { name: AUTO_TAX_NAME, amount: taxAmount },
        ...deductionsPayload,
      ];
    }

    const payload = {
      employeeId: form.employeeId,
      currencyId: form.currencyId,
      wageType: form.wageType,
      payFrequency: form.payFrequency,
      basic: Number(form.basic) || 0,
      hourlyRate: Number(form.hourlyRate) || 0,
      dailyRate: Number(form.dailyRate) || 0,
      overtimeRateMultiplier: Number(form.overtimeRateMultiplier) || 1,
      allowances: allowancesPayload,
      deductions: deductionsPayload,
    };

    if (superAdmin) payload.companyId = form.companyId; // backend resolves it for company admins

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateSalaryStructure(structure._id, payload)
        : await createSalaryStructure(payload);
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
          width: 620,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="dollar" size={16} />{" "}
            {isEdit ? "Edit Salary Structure" : "Add Salary Structure"}
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

        <form onSubmit={handleSubmit}>
          <Section title="Assignment" first />
          <Row>
            {superAdmin && (
              <Field label="Company *">
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.companyId}
                  onChange={onCompanyChange}
                  disabled={isEdit}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.legalName}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Employee *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.employeeId}
                onChange={set("employeeId")}
                disabled={isEdit || !ready}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select employee"}
                </option>
                {availableEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {fullName(usersById[idOf(emp.userId)]) ||
                      `Employee #${emp.id_int ?? ""}`}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Currency *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.currencyId}
                onChange={set("currencyId")}
              >
                <option value="">Select currency</option>
                {currencies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pay Frequency *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.payFrequency}
                onChange={set("payFrequency")}
              >
                {PAY_FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {f[0].toUpperCase() + f.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          <Section title="Pay Rate" />
          <Row>
            <Field label="Wage Type *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.wageType}
                onChange={set("wageType")}
              >
                {WAGE_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w[0].toUpperCase() + w.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Basic *">
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.basic}
                onChange={set("basic")}
              />
            </Field>
          </Row>
          <Row>
            {/* {form.wageType === "hourly" && (
              <Field label="Hourly Rate *">
                <input
                  type="number"
                  min="0"
                  className="search-box"
                  style={inputStyle}
                  value={form.hourlyRate}
                  onChange={set("hourlyRate")}
                />
              </Field>
            )} */}
            {form.wageType === "daily" && (
              <Field label="Daily Rate *">
                <input
                  type="number"
                  min="0"
                  className="search-box"
                  style={inputStyle}
                  value={form.dailyRate}
                  onChange={set("dailyRate")}
                />
              </Field>
            )}
            <Field label="Overtime Rate Multiplier">
              <input
                type="number"
                min="0"
                step="0.1"
                className="search-box"
                style={inputStyle}
                value={form.overtimeRateMultiplier}
                onChange={set("overtimeRateMultiplier")}
              />
            </Field>
          </Row>

          {showBreakdown && (
            <>
              <Section title="Salary Breakdown (Nepal Income Tax)" />
              <Row>
                <Field label="Gross Salary (monthly) *">
                  <input
                    type="number"
                    min="0"
                    className="search-box"
                    style={inputStyle}
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                    placeholder="e.g. 20000"
                  />
                </Field>
                <Field label="Allowance (Gross − Basic)">
                  <input
                    className="search-box"
                    style={readOnlyInputStyle}
                    value={computedAllowance}
                    readOnly
                  />
                </Field>
              </Row>
              {isHourly && (
                <Row>
                  <Field
                    label="Working Hours (this month)"
                    hint={
                      companySettings
                        ? `Auto: ${dailyWorkingHours(companySettings.workingHours)} hrs/day × ${workingDaysInMonth(
                            new Date().getFullYear(),
                            new Date().getMonth(),
                            companySettings.weekOff || [],
                          )} working days — from Company Settings`
                        : "Loading company working hours..."
                    }
                  >
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="number"
                        min="0"
                        className="search-box"
                        style={inputStyle}
                        value={
                          autoHours ? autoMonthlyHours || "" : hoursOverride
                        }
                        onChange={(e) => {
                          setAutoHours(false);
                          setHoursOverride(e.target.value);
                        }}
                      />
                      {!autoHours && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setAutoHours(true);
                            setHoursOverride("");
                          }}
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label="Hourly Rate (Gross ÷ Hours)">
                    <input
                      className="search-box"
                      style={readOnlyInputStyle}
                      value={computedHourlyRate || 0}
                      readOnly
                    />
                  </Field>
                </Row>
              )}
              <Row>
                <Field label="Income Tax / TDS (monthly)">
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      min="0"
                      className="search-box"
                      style={inputStyle}
                      value={autoTax ? computedMonthlyTax : taxOverride}
                      onChange={(e) => {
                        setAutoTax(false);
                        setTaxOverride(e.target.value);
                      }}
                    />
                    {!autoTax && (
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => {
                          setAutoTax(true);
                          setTaxOverride("");
                        }}
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </Field>
                <Field label="Net Pay (estimate)">
                  <input
                    className="search-box"
                    style={readOnlyInputStyle}
                    value={netPay}
                    readOnly
                  />
                </Field>
              </Row>
              <p
                className="muted"
                style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
              >
                Tax uses Nepal's FY 2083/84 (2026/27) slabs — 1% up to Rs
                10,00,000/year, rising to 29% above Rs 40,00,000/year —
                estimated from gross × 12 ÷ 12. Confirm with an accountant if
                you rely on this for compliance; slabs can change each Shrawan
                (mid-July) budget.
              </p>
            </>
          )}

          <Section title="Other Allowances & Deductions" />
          <LineItemEditor
            title="Additional Allowances"
            lines={allowances}
            setLines={setAllowances}
          />
          <LineItemEditor
            title="Additional Deductions"
            lines={deductions}
            setLines={setDeductions}
          />

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
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
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Structure"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
