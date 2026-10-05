const BaseTenantService = require("./base-tenant.service");
const shiftRepository = require("../repositories/shift.repository");
const { shiftLengthMinutes } = require("../utils/shift.util");

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const badRequest = (message) =>
  Object.assign(new Error(message), { statusCode: 400 });

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

  async create(data, actingUser) {
    validateShift(data);
    return await super.create(data, actingUser);
  }

  async update(id, data, actingUser) {
    const current = await shiftRepository.findById(id);
    if (!current) throw new Error(this.notFoundMessage);

    // Validate the shift as it will look after the change.
    validateShift({ ...current.toObject(), ...data });
    return await super.update(id, data, actingUser);
  }
}

module.exports = new ShiftService();
