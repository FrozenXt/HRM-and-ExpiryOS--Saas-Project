import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { createPayroll, updatePayroll } from "../services/payrollService";
import { getCompanySettings } from "../services/settingsService";
import { getAttendanceForPeriod } from "../services/attendanceService";
import { getApprovedLeaveDays } from "../services/leaveService";
import {
  daysInMonth,
  periodRange,
  splitHoursFromAttendance,
  standardHoursPerDayFromSettings,
  computePay,
} from "../utils/payrollCalculations";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const toMonthInput = (period) => period || ""; // already "YYYY-MM"

const emptyForm = {
  companyId: "",
  employeeId: "",
  currencyId: "",
  wageType: "monthly",
  period: "",
  payableDays: "",
  regularHours: "",
  overtimeHours: "",
  grossPay: "",
  overtimePay: "",
  deductions: "",
};

const readOnlyInputStyle = { ...inputStyle, background: "var(--surface-2)" };

export default function PayrollFormModal({
  mode = "create",
  payroll,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !payroll)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(payroll.companyId),
      employeeId: idOf(payroll.employeeId),
      currencyId: idOf(payroll.currencyId),
      wageType: payroll.wageType || "monthly",
      period: toMonthInput(payroll.period),
      payableDays: payroll.payableDays ?? "",
      regularHours: payroll.regularHours ?? "",
      overtimeHours: payroll.overtimeHours ?? "",
      grossPay: payroll.grossPay ?? "",
      overtimePay: payroll.overtimePay ?? "",
      deductions: payroll.deductions ?? "",
    };
  });

  // Whether grossPay / overtimePay should track the hours fields automatically,
  // or the admin has typed over them by hand. Editing hours never overwrites a
  // manual figure — only the "Auto" button snaps a field back to computed.
  const [autoGross, setAutoGross] = useState(!isEdit);
  const [autoOvertime, setAutoOvertime] = useState(!isEdit);

  const [companies, setCompanies] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [lookups, setLookups] = useState({
    users: [],
    employees: [],
    structures: [],
  });
  const [settings, setSettings] = useState(null);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [calcStatus, setCalcStatus] = useState(""); // "" | "loading" | "done" | "error"
  const [calcNote, setCalcNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  useEffect(() => {
    listOptions("currencies")
      .then(setCurrencies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const ready = superAdmin ? !!form.companyId : true;
  const scopeId = superAdmin ? form.companyId : undefined;

  // Employees + their salary structures (for rates) + company settings
  // (for the standard hours/day used to split regular vs overtime and cap it).
  useEffect(() => {
    if (!ready) {
      setLookups({ users: [], employees: [], structures: [] });
      setSettings(null);
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("users", scopeId),
      listOptions("employees", scopeId),
      listOptions("salary-structures", scopeId),
      getCompanySettings(form.companyId).then((r) => r.data.data),
    ])
      .then(([users, employees, structures, companySettings]) => {
        if (cancelled) return;
        setLookups({ users, employees, structures });
        setSettings(companySettings);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => !cancelled && setLoadingLookups(false));
    return () => {
      cancelled = true;
    };
  }, [form.companyId]);

  const usersById = useMemo(
    () => Object.fromEntries(lookups.users.map((u) => [u._id, u])),
    [lookups.users],
  );
  const structuresByEmployee = useMemo(
    () =>
      Object.fromEntries(
        lookups.structures.map((s) => [idOf(s.employeeId), s]),
      ),
    [lookups.structures],
  );
  const currentStructure = structuresByEmployee[form.employeeId];

  // Picking an employee pulls in their pay rates + currency automatically.
  const onEmployeeChange = (e) => {
    const employeeId = e.target.value;
    const structure = structuresByEmployee[employeeId];
    setForm((f) => ({
      ...f,
      employeeId,
      currencyId: structure ? idOf(structure.currencyId) : f.currencyId,
      wageType: structure?.wageType || f.wageType,
    }));
  };

  const onCompanyChange = (e) =>
    setForm((f) => ({ ...f, companyId: e.target.value, employeeId: "" }));

  // --- Standard capacity & the regular-hours cap ---------------------------
  const standardHoursPerDay = useMemo(
    () => standardHoursPerDayFromSettings(settings),
    [settings],
  );

  // The standard hours this structure's own hourly rate implies
  // (basic ÷ hourlyRate). This is deliberately derived from the structure
  // itself, the same basis computePay caps against — not recomputed
  // independently from company settings, which was the earlier bug: two
  // different "standard hours" figures that could disagree.
  const structureStandardHours = useMemo(() => {
    if (form.wageType !== "hourly") return 0;
    const rate = currentStructure?.hourlyRate || 0;
    const basic = currentStructure?.basic || 0;
    const allowanceTotal = (currentStructure?.allowances || []).reduce(
      (n, a) => n + (a.amount || 0),
      0,
    );
    const gross = basic + allowanceTotal;
    return rate > 0 ? Math.round((gross / rate) * 100) / 100 : 0;
  }, [form.wageType, currentStructure]);

  const isHoursCapped =
    structureStandardHours > 0 &&
    Number(form.regularHours) > structureStandardHours;
  // ---------------------------------------------------------------------------

  const runAutoCalculation = async (employeeId, period, structure) => {
    if (!employeeId || !period) return;
    setCalcStatus("loading");
    setCalcNote("");
    try {
      const { start, end } = periodRange(period);
      const monthDays = daysInMonth(period);
      const [records, leaveDays] = await Promise.all([
        getAttendanceForPeriod(
          employeeId,
          start.toISOString(),
          end.toISOString(),
        ),
        getApprovedLeaveDays(
          employeeId,
          start.toISOString(),
          end.toISOString(),
        ),
      ]);
      const { regularHours, overtimeHours } = splitHoursFromAttendance(
        records,
        standardHoursPerDay,
      );
      const payableDays = Math.max(0, monthDays - leaveDays);

      // Filling in hours/days re-enables auto pay, so it recomputes from
      // these fresh numbers instead of staying frozen on an old override.
      setAutoGross(true);
      setAutoOvertime(true);
      setForm((f) => ({ ...f, payableDays, regularHours, overtimeHours }));
      setCalcNote(
        `Computed from ${records.length} attendance record(s) and ${leaveDays} leave day(s) out of ${monthDays} days this period.`,
      );
      setCalcStatus("done");
    } catch (err) {
      setCalcStatus("error");
      setCalcNote(
        err.response?.data?.message ||
          err.message ||
          "Couldn't auto-calculate — enter the figures manually.",
      );
    }
  };

  // Auto-run once employee + period + settings are all in place (create mode
  // only — editing a draft keeps its saved figures until "Recalculate" is
  // pressed explicitly).
  useEffect(() => {
    if (isEdit) return;
    if (!form.employeeId || !form.period || !settings) return;
    runAutoCalculation(
      form.employeeId,
      form.period,
      structuresByEmployee[form.employeeId],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.employeeId, form.period, settings]);

  // Keep grossPay / overtimePay following the hours fields live — this is
  // what makes typing "180" into Regular Hours actually change Net Pay,
  // instead of only working right after the one-time auto-calc. Only runs
  // for whichever of the two fields is still in "auto" mode; typing directly
  // into grossPay/overtimePay switches that field to manual and this effect
  // leaves it alone until "Auto" is clicked again.
  useEffect(() => {
    if (!autoGross && !autoOvertime) return;
    const monthDays = form.period ? daysInMonth(form.period) : 0;
    const pay = computePay({
      wageType: form.wageType,
      structure: currentStructure,
      regularHours: Number(form.regularHours) || 0, // computePay itself caps hourly base pay at `basic` // capped — hours beyond capacity earn nothing extra here
      overtimeHours: Number(form.overtimeHours) || 0,
      payableDays: Number(form.payableDays) || 0,
      monthDays,
    });
    setForm((f) => ({
      ...f,
      ...(autoGross ? { grossPay: pay.grossPay } : {}),
      ...(autoOvertime ? { overtimePay: pay.overtimePay } : {}),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.regularHours,
    form.overtimeHours,
    form.payableDays,
    form.wageType,
    form.period,
    currentStructure,
    autoGross,
    autoOvertime,
  ]);

  const onGrossPayChange = (e) => {
    setAutoGross(false);
    setForm((f) => ({ ...f, grossPay: e.target.value }));
  };
  const onOvertimePayChange = (e) => {
    setAutoOvertime(false);
    setForm((f) => ({ ...f, overtimePay: e.target.value }));
  };

  const netPay = useMemo(() => {
    const g = Number(form.grossPay) || 0;
    const o = Number(form.overtimePay) || 0;
    const d = Number(form.deductions) || 0;
    return Math.round((g + o - d) * 100) / 100;
  }, [form.grossPay, form.overtimePay, form.deductions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.employeeId ||
      !form.currencyId ||
      !form.wageType ||
      !form.period
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      employeeId: form.employeeId,
      currencyId: form.currencyId,
      wageType: form.wageType,
      period: form.period,
      payableDays: Number(form.payableDays) || 0,
      regularHours: Number(form.regularHours) || 0,
      overtimeHours: Number(form.overtimeHours) || 0,
      grossPay: Number(form.grossPay) || 0,
      overtimePay: Number(form.overtimePay) || 0,
      deductions: Number(form.deductions) || 0,
      netPay,
    };
    if (superAdmin) payload.companyId = form.companyId; // backend resolves it for company admins

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updatePayroll(payroll._id, payload)
        : await createPayroll(payload);
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

  const numberField = (key, extra = {}) => (
    <input
      type="number"
      className="search-box"
      style={inputStyle}
      value={form[key]}
      onChange={set(key)}
      {...extra}
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
          width: 640,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="dollar" size={16} />{" "}
            {isEdit ? "Edit Draft Payroll" : "Generate Payroll"}
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
                onChange={onEmployeeChange}
                disabled={isEdit || !ready}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select employee"}
                </option>
                {lookups.employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {fullName(usersById[idOf(emp.userId)]) ||
                      `Employee #${emp.id_int ?? ""}`}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Period *">
              <input
                type="month"
                className="search-box"
                style={inputStyle}
                value={form.period}
                onChange={set("period")}
                disabled={isEdit}
              />
            </Field>
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
          </Row>
          <Row>
            <Field label="Wage Type *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.wageType}
                onChange={set("wageType")}
              >
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
              </select>
            </Field>
            <Field label=" ">
              <button
                type="button"
                className="btn btn-sm"
                style={{ width: "100%" }}
                disabled={
                  !form.employeeId || !form.period || calcStatus === "loading"
                }
                onClick={() =>
                  runAutoCalculation(
                    form.employeeId,
                    form.period,
                    currentStructure,
                  )
                }
              >
                <Icon name="clock" size={13} />{" "}
                {calcStatus === "loading"
                  ? "Calculating..."
                  : "Recalculate from Attendance"}
              </button>
            </Field>
          </Row>

          {calcNote && (
            <p
              className="muted"
              style={{
                fontSize: 12.5,
                marginBottom: 14,
                color: calcStatus === "error" ? "var(--red)" : undefined,
              }}
            >
              {calcNote}
            </p>
          )}

          <Section title="Days & Hours" />
          <Row>
            <Field label="Payable Days">
              {numberField("payableDays", { min: 0 })}
            </Field>
            <Field label="Regular Hours">
              {numberField("regularHours", { min: 0, step: "0.01" })}
            </Field>
            <Field label="Overtime Hours">
              {numberField("overtimeHours", { min: 0, step: "0.01" })}
            </Field>
          </Row>
          {form.wageType === "hourly" ? (
            <p
              className="muted"
              style={{
                fontSize: 12,
                marginTop: -6,
                marginBottom: 14,
                color: isHoursCapped ? "var(--red)" : undefined,
              }}
            >
              {structureStandardHours > 0 ? (
                <>
                  This employee's hourly rate implies{" "}
                  <strong>{structureStandardHours} standard hours/month</strong>{" "}
                  (basic ÷ hourly rate).{" "}
                  {isHoursCapped
                    ? `Regular pay is capped at the structure's basic amount — the extra ${(
                        Number(form.regularHours) - structureStandardHours
                      ).toFixed(
                        2,
                      )} hrs won't add regular pay unless moved into Overtime Hours.`
                    : "Regular pay tracks Regular Hours × hourly rate, capped at the structure's basic amount."}
                </>
              ) : (
                "Select an employee with an hourly salary structure to see the standard-hours reference."
              )}
            </p>
          ) : (
            <p
              className="muted"
              style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
            >
              All fields above are fully editable — type over any of them.
            </p>
          )}

          <Section title="Pay" />
          <Row>
            <Field label="Gross Pay">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="search-box"
                  style={inputStyle}
                  value={form.grossPay}
                  onChange={onGrossPayChange}
                />
                {!autoGross && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setAutoGross(true)}
                  >
                    Auto
                  </button>
                )}
              </div>
            </Field>
            <Field label="Overtime Pay">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="search-box"
                  style={inputStyle}
                  value={form.overtimePay}
                  onChange={onOvertimePayChange}
                />
                {!autoOvertime && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => setAutoOvertime(true)}
                  >
                    Auto
                  </button>
                )}
              </div>
            </Field>
            <Field label="Deductions">
              {numberField("deductions", { min: 0, step: "0.01" })}
            </Field>
          </Row>
          <p
            className="muted"
            style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
          >
            Gross/Overtime Pay recompute automatically from the hours above
            unless you type over them directly — click "Auto" to snap a field
            back to the computed value.
          </p>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12.5,
                color: "var(--text-dim)",
              }}
            >
              Net Pay (Gross + Overtime − Deductions)
            </label>
            <input
              className="search-box"
              style={readOnlyInputStyle}
              value={netPay}
              readOnly
            />
          </div>

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
                  : "Create Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
