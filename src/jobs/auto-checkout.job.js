// src/jobs/auto-checkout.job.js
//
// Closes attendance records that were never checked out, using each company's
// own settings (attendancePolicy.autoCheckout*) and each employee's shift.
// Also sets the final status (present / late / half_day / absent) like a
// manual check-out would.

const cron = require("node-cron");
const CompanySettings = require("../models/company-settings.model");
const Employee = require("../models/employee.model");
const Attendance = require("../models/attendance.model");
const Shift = require("../models/shift.model");
const {
  resolveEffectiveShift,
  computeAutoCheckoutCutoff,
  statusAfterCheckOut,
} = require("../utils/shift.util");

async function runAutoCheckout(now = new Date()) {
  const configs = await CompanySettings.find({
    "attendancePolicy.autoCheckoutEnabled": true,
  }).lean();

  let closed = 0;

  for (const cfg of configs) {
    const [employees, shifts] = await Promise.all([
      Employee.find({ companyId: cfg.companyId }).select("_id shiftId").lean(),
      Shift.find({ companyId: cfg.companyId }).lean(),
    ]);
    if (!employees.length) continue;

    const shiftById = new Map(shifts.map((s) => [String(s._id), s]));
    const shiftOfEmployee = new Map(
      employees.map((e) => [
        String(e._id),
        e.shiftId ? shiftById.get(String(e.shiftId)) : null,
      ]),
    );

    // Open records: checked in, never checked out.
    const open = await Attendance.find({
      employeeId: { $in: employees.map((e) => e._id) },
      checkIn: { $ne: null },
      checkOut: null, // matches null or missing
    })
      .select("_id employeeId checkIn status")
      .lean();

    for (const rec of open) {
      const shift = resolveEffectiveShift(
        shiftOfEmployee.get(String(rec.employeeId)),
        cfg,
      );
      const cutoff = computeAutoCheckoutCutoff(
        rec.checkIn,
        cfg.attendancePolicy,
        { shift },
        now,
      );
      if (!cutoff) continue;

      const status = statusAfterCheckOut({
        currentStatus: rec.status,
        checkIn: rec.checkIn,
        checkOut: cutoff,
        shift,
        policy: cfg.attendancePolicy,
      });

      // checkOut: null in the filter keeps this safe if the employee checks
      // out manually at the same moment.
      const res = await Attendance.updateOne(
        { _id: rec._id, checkOut: null },
        { $set: { checkOut: cutoff, autoCheckedOut: true, status } },
      );
      closed += res.modifiedCount || 0;
    }
  }

  return closed;
}

function start() {
  // every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    try {
      const n = await runAutoCheckout();
      if (n)
        console.log(`[auto-checkout] closed ${n} open attendance record(s)`);
    } catch (err) {
      console.error("[auto-checkout] failed:", err.message);
    }
  });
  console.log("[auto-checkout] scheduler started (every 5 min)");
}

module.exports = { start, runAutoCheckout };
