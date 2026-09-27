export function daysInMonth(period) {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function periodRange(period) {
  const [y, m] = period.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

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
  if (wageType === "hourly") base = hourlyRate * regularHours;
  else if (wageType === "daily") base = dailyRate * payableDays;
  else base = monthDays ? (basic * payableDays) / monthDays : basic; // monthly, pro-rated

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
