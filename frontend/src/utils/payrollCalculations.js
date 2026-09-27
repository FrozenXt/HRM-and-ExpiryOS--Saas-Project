// Pure functions — no API calls, no React — so they're easy to unit test
// and reuse from both the payroll form and (if you want later) a payroll
// preview/report screen.

/** "2026-09" -> 30 (calendar days in that month, matching how the API's
 *  own example treats "total company days" — see PayrollFormModal notes). */
export function daysInMonth(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** "2026-09" -> { start: Date(2026-09-01), end: Date(2026-09-30) } */
export function periodRange(period) {
  const [y, m] = period.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Standard hours in one working day, derived from company settings'
 * workingHours.startTime/endTime (e.g. "09:00"–"18:00" -> 9). Falls back to
 * attendancePolicy.fullDayMinHours, then a hard default of 8, if working
 * hours aren't set or don't parse. Doesn't handle overnight shifts
 * (endTime earlier than startTime) — treat that as a known limitation.
 */
export function standardHoursPerDayFromSettings(settings) {
  const wh = settings?.workingHours;
  if (wh?.startTime && wh?.endTime) {
    const toHours = (t) => {
      const [h, m] = t.split(":").map(Number);
      return h + (m || 0) / 60;
    };
    const diff = toHours(wh.endTime) - toHours(wh.startTime);
    if (diff > 0) return diff;
  }
  return settings?.attendancePolicy?.fullDayMinHours || 8;
}

/**
 * Sums checkIn/checkOut gaps from a list of attendance records, splitting
 * each day's hours into regular vs. overtime against a standard day length.
 */
export function splitHoursFromAttendance(records, standardHoursPerDay = 8) {
  let regularHours = 0;
  let overtimeHours = 0;

  for (const r of records) {
    if (!r.checkIn || !r.checkOut) continue; // ignore open/incomplete days
    const worked = (new Date(r.checkOut) - new Date(r.checkIn)) / 3_600_000;
    if (worked <= 0) continue;
    regularHours += Math.min(worked, standardHoursPerDay);
    overtimeHours += Math.max(0, worked - standardHoursPerDay);
  }

  return {
    regularHours: round2(regularHours),
    overtimeHours: round2(overtimeHours),
  };
}

/**
 * Derives grossPay / overtimePay / deductions / netPay from a salary
 * structure plus the hours/days worked out for the period. All results are
 * suggestions the form pre-fills — the admin can still edit before saving.
 */
export function computePay({
  wageType,
  structure,
  regularHours,
  overtimeHours,
  payableDays,
  monthDays,
}) {
  const hourlyRate = structure?.hourlyRate || 0;
  const dailyRate = structure?.dailyRate || 0;
  const basic = structure?.basic || 0;
  const overtimeMultiplier = structure?.overtimeRateMultiplier || 1;
  const allowances = (structure?.allowances || []).reduce(
    (n, a) => n + (a.amount || 0),
    0,
  );
  const deductions = (structure?.deductions || []).reduce(
    (n, d) => n + (d.amount || 0),
    0,
  );

  let base = 0;
  if (wageType === "hourly") {
    // Regular-hours pay is contracted against the structure's "basic"
    // component — basic + allowances is the monthly gross the hourly rate
    // was derived from when the structure was created. Logging (or typing
    // in) more regular hours than that rate implies must never push
    // "regular" pay past that contracted figure; extra hours only earn
    // money through Overtime Hours, at the overtime rate.
    base = Math.min(hourlyRate * regularHours, basic);
  } else if (wageType === "daily") {
    base = dailyRate * payableDays;
  } else {
    base = monthDays ? (basic * payableDays) / monthDays : basic; // monthly, pro-rated
  }

  const grossPay = round2(base + allowances);
  const overtimePay = round2(hourlyRate * overtimeHours * overtimeMultiplier);
  const roundedDeductions = round2(deductions);

  return {
    grossPay,
    overtimePay,
    deductions: roundedDeductions,
    netPay: round2(grossPay + overtimePay - roundedDeductions),
  };
}
