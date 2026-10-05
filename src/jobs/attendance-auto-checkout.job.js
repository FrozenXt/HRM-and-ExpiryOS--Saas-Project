const Company = require("../models/company.model");
const companySettingsRepository = require("../repositories/company-settings.repository");
const attendanceRepository = require("../repositories/attendance.repository");

const RUN_INTERVAL_MS = 15 * 60 * 1000;
const AUTO_CHECKOUT_GRACE_MINUTES = 60;
const DEFAULT_END_TIME = "18:00";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function cutoffFor(endTime) {
  const [h, m] = (endTime || DEFAULT_END_TIME).split(":").map(Number);
  const cutoff = new Date();
  cutoff.setHours(h, m, 0, 0);
  cutoff.setMinutes(cutoff.getMinutes() + AUTO_CHECKOUT_GRACE_MINUTES);
  return cutoff;
}

async function runOnce() {
  const companies = await Company.find({ isActive: true }).select("_id");
  const today = startOfToday();
  const now = new Date();

  for (const company of companies) {
    try {
      const settings = await companySettingsRepository.findByCompanyId(
        company._id,
      );
      const endTime = settings?.workingHours?.endTime || DEFAULT_END_TIME;
      const cutoff = cutoffFor(endTime);

      if (now < cutoff) continue; // this company's cutoff hasn't arrived yet

      const open = await attendanceRepository.findOpenCheckIns(
        company._id,
        today,
      );
      if (!open.length) continue;

      await attendanceRepository.autoCloseMany(
        open.map((r) => r._id),
        cutoff,
      );

      if (settings?.notifications?.attendanceAlerts !== false) {
        console.log(
          `[auto-checkout] Company ${company._id}: closed ${open.length} missed checkout(s) at ${cutoff.toISOString()}`,
        );
      }
    } catch (err) {
      console.error(
        `[auto-checkout] Company ${company._id} failed:`,
        err.message,
      );
    }
  }
}

function start() {
  runOnce().catch((err) =>
    console.error("[auto-checkout] initial run failed:", err.message),
  );
  setInterval(() => {
    runOnce().catch((err) =>
      console.error("[auto-checkout] run failed:", err.message),
    );
  }, RUN_INTERVAL_MS);
  console.log(
    `[auto-checkout] job started, checking every ${RUN_INTERVAL_MS / 60000} min`,
  );
}

module.exports = { start, runOnce };
