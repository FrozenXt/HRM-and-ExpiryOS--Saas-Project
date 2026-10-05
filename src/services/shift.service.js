const BaseTenantService = require("./base-tenant.service");
const shiftRepository = require("../repositories/shift.repository");
const { shiftLengthMinutes } = require("../utils/shift.util");
const { notifyBulk, adminHrIds } = require("./notification.service");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const badRequest = (message) =>
  Object.assign(new Error(message), { statusCode: 400 });

const fullName = (u) =>
  u ? `${u.firstName} ${u.lastName || ""}`.trim() : "Someone";

function validateShift(s) {
  if (!HHMM.test(s.startTime || "") || !HHMM.test(s.endTime || "")) {
    throw badRequest("Start and end time must be in HH:mm format");
  }
  if (s.startTime === s.endTime) {
    throw badRequest("Start and end time cannot be the same");
  }
  const length = shiftLengthMinutes(s.startTime, s.endTime);
  if ((Number(s.breakMinutes) || 0) >= length) {
    throw badRequest("Break must be shorter than the shift");
  }
}

class ShiftService extends BaseTenantService {
  constructor() {
    super(shiftRepository, "Shift not found");
  }

  // Admin/HR get an in-app notification (minus the person who made the
  // change). Never throws, so a notification problem can't make the
  // shift create/update fail.
  async _notifyChange(shift, actingUser, action) {
    try {
      const companyId = shift.companyId || actingUser.companyId;
      if (!companyId) return;

      const ids = await adminHrIds(companyId, [actingUser._id]);
      const label = shift.name ? `"${shift.name}"` : "a shift";

      await notifyBulk(ids, {
        companyId,
        type: `shift_${action}`,
        title: action === "created" ? "Shift created" : "Shift updated",
        message: `${fullName(actingUser)} ${action} ${label} (${shift.startTime}–${shift.endTime}).`,
        link: "/shifts",
        entityType: "Shift",
        entityId: shift._id,
      });
    } catch (err) {
      console.error("[shift] notify failed:", err.message);
    }
  }

  async create(data, actingUser) {
    validateShift(data);
    const created = await super.create(data, actingUser);

    await this._notifyChange(created, actingUser, "created");

    return created;
  }

  async update(id, data, actingUser) {
    const current = await shiftRepository.findById(id);
    if (!current) throw new Error(this.notFoundMessage);

    // Validate the shift as it will look after the change.
    validateShift({ ...current.toObject(), ...data });
    const updated = await super.update(id, data, actingUser);

    await this._notifyChange(updated || current, actingUser, "updated");

    return updated;
  }
}

module.exports = new ShiftService();
