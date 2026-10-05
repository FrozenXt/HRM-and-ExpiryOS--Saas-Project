const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");

const uid = (v) => (v && v._id ? v._id : v)?.toString();

const labelOf = (o) => o?.name || o?.title || o?.designationName || null;

const hoursBetween = (a, b) => {
  if (!a || !b) return null;
  const h = (new Date(b) - new Date(a)) / 3_600_000;
  return h > 0 ? Math.round(h * 100) / 100 : 0;
};

async function attachEmployeeInfo(records, employeeField = "employeeId") {
  const list = (records || []).map((r) =>
    typeof r.toObject === "function" ? r.toObject() : r,
  );

  const employeeIds = [
    ...new Set(list.map((r) => uid(r[employeeField])).filter(Boolean)),
  ];

  const employees = employeeIds.length
    ? await Employee.find({ _id: { $in: employeeIds } })
        .select("id_int userId departmentId designationId status")
        .lean()
    : [];

  const userIds = [...new Set(employees.map((e) => uid(e.userId)))];
  const deptIds = [...new Set(employees.map((e) => uid(e.departmentId)))];
  const desigIds = [...new Set(employees.map((e) => uid(e.designationId)))];

  const [users, depts, desigs] = await Promise.all([
    User.find({ _id: { $in: userIds } })
      .select("firstName lastName email profileImage")
      .lean(),
    Department.find({ _id: { $in: deptIds } }).lean(),
    Designation.find({ _id: { $in: desigIds } }).lean(),
  ]);

  const userMap = new Map(users.map((u) => [uid(u._id), u]));
  const deptMap = new Map(depts.map((d) => [uid(d._id), d]));
  const desigMap = new Map(desigs.map((d) => [uid(d._id), d]));
  const empMap = new Map(employees.map((e) => [uid(e._id), e]));

  return list.map((r) => {
    const emp = empMap.get(uid(r[employeeField]));
    const user = emp ? userMap.get(uid(emp.userId)) : null;
    const name = user
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : null;

    return {
      ...r,
      employeeName: name,
      profileImage: user?.profileImage ?? null,
      ...("checkIn" in r
        ? { workedHours: hoursBetween(r.checkIn, r.checkOut) }
        : {}),
      employee: emp
        ? {
            _id: emp._id,
            id_int: emp.id_int,
            userId: emp.userId,
            status: emp.status,
            name,
            firstName: user?.firstName ?? null,
            lastName: user?.lastName ?? null,
            email: user?.email ?? null,
            profileImage: user?.profileImage ?? null,
            department: labelOf(deptMap.get(uid(emp.departmentId))),
            designation: labelOf(desigMap.get(uid(emp.designationId))),
          }
        : null,
    };
  });
}

module.exports = { attachEmployeeInfo };
