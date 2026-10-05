const Employee = require("../models/employee.model");
const LeaveType = require("../models/leave-type.model");
const LeaveBalance = require("../models/leave-balance.model");
const LeaveRequest = require("../models/leave-request.model");

const DAY = 24 * 60 * 60 * 1000;

// Inclusive day count, e.g. 10th to 12th = 3.
const countDays = (from, to) =>
  Math.floor((new Date(to) - new Date(from)) / DAY) + 1;

// Creates any missing balance (employee x leave type x year) with the full
// quota. Existing balances are never touched, so it is safe to call often.
async function ensureBalances({ companyId, employeeIds, year }) {
  const y = year || new Date().getFullYear();

  const employeeFilter = employeeIds
    ? { _id: { $in: employeeIds } }
    : { companyId, status: "active" };

  const [employees, leaveTypes] = await Promise.all([
    Employee.find(employeeFilter).select("_id companyId").lean(),
    LeaveType.find({ companyId }).select("_id annualQuota").lean(),
  ]);

  const ops = [];
  for (const emp of employees) {
    for (const lt of leaveTypes) {
      const quota = lt.annualQuota ?? 0;
      ops.push({
        updateOne: {
          filter: { employeeId: emp._id, leaveTypeId: lt._id, year: y },
          update: {
            $setOnInsert: {
              companyId: emp.companyId,
              allocated: quota,
              used: 0,
              remaining: quota,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (ops.length) await LeaveBalance.bulkWrite(ops, { ordered: false });
}

// Days in pending requests, keyed "employeeId:leaveTypeId:year".
async function pendingDaysMap(employeeIds) {
  const pending = await LeaveRequest.find({
    employeeId: { $in: employeeIds },
    status: "pending",
  })
    .select("employeeId leaveTypeId fromDate toDate")
    .lean();

  const map = new Map();
  for (const r of pending) {
    const key = `${r.employeeId}:${r.leaveTypeId}:${new Date(r.fromDate).getFullYear()}`;
    map.set(key, (map.get(key) || 0) + countDays(r.fromDate, r.toDate));
  }
  return map;
}

module.exports = { countDays, ensureBalances, pendingDaysMap };
