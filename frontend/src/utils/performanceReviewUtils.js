// Helpers shared by the Performance Reviews page and form modal.

const clean = (v) => (typeof v === "string" ? v.trim() : "");

// Works with several likely employee shapes, so the name shows even if the
// list endpoint returns the user populated, flattened, or only partly filled.
export const employeeName = (emp) => {
  if (!emp) return "-";

  const user = emp.userId && typeof emp.userId === "object" ? emp.userId : null;

  const candidates = [
    user && `${clean(user.firstName)} ${clean(user.lastName)}`,
    `${clean(emp.firstName)} ${clean(emp.lastName)}`,
    clean(emp.fullName),
    clean(emp.name),
    user && clean(user.name),
    user && clean(user.email),
    clean(emp.email),
    clean(emp.workEmail),
  ];

  const found = candidates.find((c) => c && c.trim());
  if (found) return found.trim();

  // Last resort so the option is never blank.
  return emp.id_int ? `Employee #${emp.id_int}` : "Unnamed employee";
};

// Label used in the "Employee" dropdown: name + department when available.
export const employeeOptionLabel = (emp) => {
  const dept = emp?.departmentId?.name;
  return dept ? `${employeeName(emp)} — ${dept}` : employeeName(emp);
};
