const CompanySettings = require("../models/company-settings.model");
const Holiday = require("../models/holiday.model");

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DEFAULT_TZ = "Asia/Kathmandu";
const pad = (n) => String(n).padStart(2, "0");

// "YYYY-MM-DD" for `date` as seen in the company's timezone.
function dateKeyInZone(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    const d = new Date(date);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
}

// Is `at` a normal working day for this company?
// Reads the week-off days from settings, so it is fully dynamic.
async function checkWorkingDay(companyId, at = new Date()) {
  if (!companyId) return { allowed: true };

  const settings = await CompanySettings.findOne({ companyId })
    .select("workingHours weekOff")
    .lean();

  const tz = settings?.workingHours?.timezone || DEFAULT_TZ;
  const weekOff = settings?.weekOff ?? ["sat", "sun"];

  const key = dateKeyInZone(at, tz);
  const [y, m, d] = key.split("-").map(Number);
  const dayStart = new Date(Date.UTC(y, m - 1, d));
  const dayEnd = new Date(Date.UTC(y, m - 1, d + 1));

  // Holidays are stored one row per date (UTC midnight, from a date input).
  const holiday = await Holiday.findOne({
    companyId,
    date: { $gte: dayStart, $lt: dayEnd },
  })
    .select("name")
    .lean();

  if (holiday) {
    return {
      allowed: false,
      type: "holiday",
      name: holiday.name,
      dateKey: key,
      weekOff,
      message: `Today is a holiday (${holiday.name}). Check-in is not available.`,
    };
  }

  const weekday = WEEKDAYS[dayStart.getUTCDay()];
  if (weekOff.includes(weekday)) {
    return {
      allowed: false,
      type: "weekoff",
      name: "Week off",
      dateKey: key,
      weekOff,
      message: "Today is a weekly off day. Check-in is not available.",
    };
  }

  return { allowed: true, dateKey: key, weekOff };
}

module.exports = { checkWorkingDay };
