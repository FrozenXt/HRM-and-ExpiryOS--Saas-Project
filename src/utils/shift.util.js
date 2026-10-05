// src/utils/shift.util.js
// Shift + attendance rules. Pure functions (no DB), so they are easy to test.
// All "local" times are in the company's timezone (settings.workingHours.timezone).

const DEFAULT_TZ = "Asia/Kathmandu";
const HOUR = 3600 * 1000;
const DAY_MS = 24 * HOUR;
const EARLY_MS = 6 * HOUR; // a check-in up to 6h before shift start still belongs to that shift

/* ---------- timezone helpers (no extra dependency) ---------- */

// Offset (ms) of `tz` from UTC at the instant `ts`.
function tzOffsetMs(ts, tz) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(ts))
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour,
    +p.minute,
    +p.second,
  );
  return asUtc - Math.floor(ts / 1000) * 1000;
}

// "YYYY-MM-DD" of an instant as seen in `tz`.
function localDateStr(date, tz) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// The UTC instant for local wall-clock `HH:mm` on local date `YYYY-MM-DD`.
function zonedToUtc(dateStr, hhmm, tz) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return new Date(guess - tzOffsetMs(guess, tz));
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/* ---------- shift basics ---------- */

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// End time at or before start time means the shift runs past midnight.
const isOvernight = (start, end) => toMinutes(end) <= toMinutes(start);

function shiftLengthMinutes(start, end) {
  let d = toMinutes(end) - toMinutes(start);
  if (d <= 0) d += 1440;
  return d;
}

// What applies to an employee: their shift if they have an active one,
// otherwise the company's working hours.
function resolveEffectiveShift(shiftDoc, settings) {
  const wh = settings?.workingHours || {};
  const policy = settings?.attendancePolicy || {};
  const own = shiftDoc && shiftDoc.isActive !== false ? shiftDoc : null;

  const startTime = own?.startTime || wh.startTime || "09:00";
  const endTime = own?.endTime || wh.endTime || "18:00";

  return {
    source: own ? "shift" : "company",
    name: own?.name || "Company hours",
    startTime,
    endTime,
    breakMinutes: own?.breakMinutes ?? 0,
    graceMinutes: own?.graceMinutes ?? policy.lateMarkGraceMinutes ?? 15,
    overnight: isOvernight(startTime, endTime),
    tz: wh.timezone || DEFAULT_TZ,
  };
}

// Start/end instants of the shift that begins on local date `dateStr`.
function shiftWindowOnDate(dateStr, shift) {
  const start = zonedToUtc(dateStr, shift.startTime, shift.tz);
  let end = zonedToUtc(dateStr, shift.endTime, shift.tz);
  if (end <= start) end = new Date(end.getTime() + DAY_MS);
  return { start, end };
}

// Which shift occurrence does this check-in belong to? Looks at the day
// before, the same day and the day after, so night shifts work.
function windowForCheckIn(checkIn, shift) {
  const at = new Date(checkIn);
  const base = localDateStr(at, shift.tz);
  const candidates = [-1, 0, 1].map((n) =>
    shiftWindowOnDate(addDays(base, n), shift),
  );
  const inside = candidates.find(
    (w) => at.getTime() >= w.start.getTime() - EARLY_MS && at <= w.end,
  );
  if (inside) return inside;
  return candidates.reduce((a, b) =>
    Math.abs(a.start - at) <= Math.abs(b.start - at) ? a : b,
  );
}

/* ---------- attendance status ---------- */

// "late" if the check-in is after shift start + grace, otherwise "present".
function classifyCheckIn(checkIn, window, graceMinutes) {
  const limit = window.start.getTime() + (graceMinutes || 0) * 60000;
  return new Date(checkIn).getTime() > limit ? "late" : "present";
}

// Final status once the check-out time is known.
// Thresholds come from the company policy but never exceed what the shift
// itself allows (a 6h shift is not a "half day" just because the policy says 8h).
function statusAfterCheckOut({
  currentStatus,
  checkIn,
  checkOut,
  shift,
  policy,
}) {
  const worked = Math.max(0, new Date(checkOut) - new Date(checkIn)) / HOUR;
  const net =
    Math.max(
      0,
      shiftLengthMinutes(shift.startTime, shift.endTime) - shift.breakMinutes,
    ) / 60;

  const policyFull = policy?.fullDayMinHours ?? 8;
  const policyHalf = policy?.halfDayMinHours ?? 4;
  const full = net > 0 ? Math.min(policyFull, net) : policyFull;
  const half = net > 0 ? Math.min(policyHalf, net / 2) : policyHalf;

  if (worked >= full) return currentStatus === "late" ? "late" : "present";
  if (worked >= half) return "half_day";
  return "absent";
}

/* ---------- auto check-out ---------- */

// The time an open record should have been checked out at, or null if it is
// not due yet / auto-checkout is off.
//   afterHours     : check-in + N hours
//   fixedTime      : HH:mm in company time (next day if checked in after it)
//   afterShiftEnd  : the employee's shift end + N hours (works for night shifts)
function computeAutoCheckoutCutoff(checkIn, policy, ctx, now = new Date()) {
  if (!policy?.autoCheckoutEnabled) return null;

  const { shift } = ctx;
  const inAt = new Date(checkIn);
  let cutoff;

  if (policy.autoCheckoutMode === "afterShiftEnd") {
    const buffer = Number(policy.autoCheckoutShiftBufferHours ?? 2);
    cutoff = new Date(
      windowForCheckIn(inAt, shift).end.getTime() + buffer * HOUR,
    );
    if (cutoff <= inAt) {
      cutoff = new Date(inAt.getTime() + Math.max(buffer, 1) * HOUR);
    }
  } else if (policy.autoCheckoutMode === "fixedTime") {
    const time = policy.autoCheckoutTime || "20:00";
    cutoff = zonedToUtc(localDateStr(inAt, shift.tz), time, shift.tz);
    if (cutoff <= inAt) cutoff = new Date(cutoff.getTime() + DAY_MS);
  } else {
    const hours = Number(policy.autoCheckoutAfterHours) || 10;
    cutoff = new Date(inAt.getTime() + hours * HOUR);
  }

  return cutoff <= now ? cutoff : null;
}

module.exports = {
  DEFAULT_TZ,
  tzOffsetMs,
  localDateStr,
  zonedToUtc,
  addDays,
  toMinutes,
  isOvernight,
  shiftLengthMinutes,
  resolveEffectiveShift,
  shiftWindowOnDate,
  windowForCheckIn,
  classifyCheckIn,
  statusAfterCheckOut,
  computeAutoCheckoutCutoff,
};
