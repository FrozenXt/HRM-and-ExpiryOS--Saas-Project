const CompanySettings = require("../models/company-settings.model");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const { notifyBulk } = require("../services/notification.service");

const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
const fullName = (u) => `${u.firstName} ${u.lastName || ""}`.trim();

function clock(date, timeZone) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(date));
  } catch {
    return new Date(date).toTimeString().slice(0, 5);
  }
}

const hoursText = (a, b) => {
  const mins = Math.max(0, Math.round((new Date(b) - new Date(a)) / 60000));
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
};

/**
 * Tells colleagues that someone checked in or out.
 * kind: "in" | "out". Never throws, so it can't break the check-in itself.
 */
async function notifyAttendanceEvent({ kind, user, employee, record }) {
  try {
    if (!user.companyId) return;

    const settings = await CompanySettings.findOne({
      companyId: user.companyId,
    })
      .select("notifications workingHours")
      .lean();
    const audience =
      settings?.notifications?.checkInAlertAudience ?? "everyone";
    if (audience === "off") return;

    // Everyone in the company except the person who just checked in/out.
    let recipients;
    if (audience === "everyone") {
      const users = await User.find({
        companyId: user.companyId,
        status: "active",
        _id: { $ne: user._id },
      })
        .select("_id")
        .lean();
      recipients = users.map((u) => u._id);
    } else {
      // "managers": Admin, HR and the reporting manager only.
      const [staff, manager] = await Promise.all([
        User.find({
          companyId: user.companyId,
          role: { $in: ["admin", "hr"] },
          status: "active",
          _id: { $ne: user._id },
        })
          .select("_id")
          .lean(),
        employee.reportingManagerId
          ? Employee.findById(employee.reportingManagerId)
              .select("userId")
              .lean()
          : null,
      ]);
      recipients = staff.map((u) => u._id);
      if (manager?.userId && String(manager.userId) !== String(user._id)) {
        recipients.push(manager.userId);
      }
    }
    if (!recipients.length) return;

    const tz = settings?.workingHours?.timezone || "Asia/Kathmandu";
    const name = fullName(user);

    let title;
    let message;
    if (kind === "in") {
      const late = record.status === "late";
      title = late ? "Late check-in" : "Checked in";
      message = `${name} checked in at ${clock(record.checkIn, tz)}${late ? " (late)" : ""}.`;
    } else {
      title = "Checked out";
      message = `${name} checked out at ${clock(record.checkOut, tz)} · ${hoursText(record.checkIn, record.checkOut)} worked.`;
    }

    await notifyBulk(recipients, {
      companyId: user.companyId,
      type: kind === "in" ? "attendance_check_in" : "attendance_check_out",
      title,
      message,
      link: "/attendance",
      entityType: "Attendance",
      entityId: record._id,
      expireAt: new Date(Date.now() + TWO_DAYS),
    });
  } catch (err) {
    console.error("[attendance-alert] failed:", err.message);
  }
}

module.exports = { notifyAttendanceEvent };
