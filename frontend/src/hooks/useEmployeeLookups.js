import { useEffect, useState } from "react";
import { listOptions } from "../services/employeeService";
import { getCurrentUser } from "../utils/auth";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));
const isObj = (v) => v && typeof v === "object";

export default function useEmployeeLookups() {
  const role = getCurrentUser()?.role;
  const staff = role === "staff";
  const superAdmin = role === "super_admin";
  const [lookups, setLookups] = useState({
    users: {},
    employees: {},
    companies: {},
  });

  useEffect(() => {
    if (staff) return; // staff only ever see their own records — no names needed
    Promise.allSettled([
      listOptions("employees"),
      listOptions("users"),
      superAdmin ? listOptions("companies") : Promise.resolve([]),
    ]).then(([e, u, c]) =>
      setLookups({
        employees: byId(e.status === "fulfilled" ? e.value : []),
        users: byId(u.status === "fulfilled" ? u.value : []),
        companies: byId(c.status === "fulfilled" ? c.value : []),
      }),
    );
  }, [staff, superAdmin]);

  const employeeName = (ref) => {
    const emp = isObj(ref) ? ref : lookups.employees[ref];
    const user = isObj(emp?.userId) ? emp.userId : lookups.users[emp?.userId];
    return fullName(user) || "-";
  };

  const companyName = (ref) => {
    const c = isObj(ref) ? ref : lookups.companies[ref];
    return c?.legalName || "-";
  };

  return { employeeName, companyName };
}
