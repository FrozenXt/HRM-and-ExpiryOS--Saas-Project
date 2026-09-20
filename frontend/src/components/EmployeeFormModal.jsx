import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import {
  createEmployee,
  updateEmployee,
  listOptions,
} from "../services/employeeService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const optionName = (o) => o.name || o.title || o.designationName || o._id;

const emptyForm = {
  companyId: "",
  userId: "",
  departmentId: "",
  designationId: "",
  reportingManagerId: "",
  joiningDate: "",
  status: "active",
  dateOfBirth: "",
  personalEmail: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelation: "",
};

export default function EmployeeFormModal({
  mode = "create",
  employee,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin(); // company admins never pick a company

  const [form, setForm] = useState(() => {
    if (!isEdit || !employee)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      ...emptyForm,
      companyId: idOf(employee.companyId),
      userId: idOf(employee.userId),
      departmentId: idOf(employee.departmentId),
      designationId: idOf(employee.designationId),
      reportingManagerId: idOf(employee.reportingManagerId),
      joiningDate: employee.joiningDate?.slice(0, 10) || "",
      status: employee.status || "active",
      dateOfBirth: employee.dateOfBirth?.slice(0, 10) || "",
      personalEmail: employee.personalEmail || "",
      emergencyName: employee.emergencyContact?.name || "",
      emergencyPhone: employee.emergencyContact?.phone || "",
      emergencyRelation: employee.emergencyContact?.relation || "",
    };
  });

  const [companies, setCompanies] = useState([]);
  const [lookups, setLookups] = useState({
    users: [],
    departments: [],
    designations: [],
    employees: [],
  });
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Companies for the first dropdown (loaded once).
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  // Everything else depends on the chosen company (super admin) or on the
  // logged-in admin's own company (the backend scopes lists automatically).
  const ready = superAdmin ? !!form.companyId : true;
  const scopeId = superAdmin ? form.companyId : undefined;

  useEffect(() => {
    if (!ready) {
      setLookups({
        users: [],
        departments: [],
        designations: [],
        employees: [],
      });
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("users", scopeId),
      listOptions("departments", scopeId),
      listOptions("designations", scopeId),
      listOptions("employees", scopeId),
    ])
      .then(([users, departments, designations, employees]) => {
        if (!cancelled)
          setLookups({ users, departments, designations, employees });
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      })
      .finally(() => !cancelled && setLoadingLookups(false));
    return () => {
      cancelled = true;
    };
  }, [form.companyId]);

  const onCompanyChange = (e) =>
    setForm((f) => ({
      ...f,
      companyId: e.target.value,
      userId: "",
      departmentId: "",
      designationId: "",
      reportingManagerId: "",
    }));

  // Users that don't have an employee profile yet (keep the current one when editing).
  const availableUsers = useMemo(() => {
    const taken = new Set(lookups.employees.map((e) => String(idOf(e.userId))));
    return lookups.users.filter(
      (u) => u._id === form.userId || !taken.has(String(u._id)),
    );
  }, [lookups, form.userId]);

  const usersById = useMemo(
    () => Object.fromEntries(lookups.users.map((u) => [u._id, u])),
    [lookups.users],
  );

  const managers = lookups.employees.filter((e) => e._id !== employee?._id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.userId ||
      !form.departmentId ||
      !form.designationId ||
      !form.joiningDate
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      departmentId: form.departmentId,
      designationId: form.designationId,
      reportingManagerId: form.reportingManagerId || null,
      joiningDate: form.joiningDate,
      status: form.status,
      dateOfBirth: form.dateOfBirth || null,
      personalEmail: form.personalEmail || null,
      emergencyContact: {
        name: form.emergencyName || null,
        phone: form.emergencyPhone || null,
        relation: form.emergencyRelation || null,
      },
    };

    if (!isEdit) {
      if (superAdmin) payload.companyId = form.companyId; // backend resolves it for admins
      payload.userId = form.userId;
    }

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateEmployee(employee._id, payload)
        : await createEmployee(payload);
      onSaved(result.data.data);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Something went wrong",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const select = (key, options, placeholder, labelFn, extra = {}) => (
    <select
      className="search-box"
      style={inputStyle}
      value={form[key]}
      onChange={set(key)}
      {...extra}
    >
      <option value="">{loadingLookups ? "Loading..." : placeholder}</option>
      {options.map((o) => (
        <option key={o._id} value={o._id}>
          {labelFn(o)}
        </option>
      ))}
    </select>
  );

  const text = (key, extra = {}) => (
    <input
      className="search-box"
      style={inputStyle}
      value={form[key]}
      onChange={set(key)}
      {...extra}
    />
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="panel"
        style={{
          width: 620,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="users" size={16} />{" "}
            {isEdit ? "Edit Employee" : "Add Employee"}
          </h2>
          <button
            type="button"
            className="more-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon
              name="chevronRight"
              size={16}
              style={{ transform: "rotate(45deg)" }}
            />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Assignment" first />
          <Row>
            {superAdmin && (
              <Field label="Company *">
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.companyId}
                  onChange={onCompanyChange}
                  disabled={isEdit}
                >
                  <option value="">Select company</option>
                  {companies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.legalName}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="User *">
              {select(
                "userId",
                availableUsers,
                ready ? "Select user" : "Select a company first",
                (u) => `${fullName(u)} (${u.email})`,
                { disabled: isEdit || !ready },
              )}
            </Field>
          </Row>
          <Row>
            <Field label="Department *">
              {select(
                "departmentId",
                lookups.departments,
                ready ? "Select department" : "Select a company first",
                optionName,
                { disabled: !ready },
              )}
            </Field>
            <Field label="Designation *">
              {select(
                "designationId",
                lookups.designations,
                ready ? "Select designation" : "Select a company first",
                optionName,
                { disabled: !ready },
              )}
            </Field>
          </Row>
          <Row>
            <Field label="Reporting Manager">
              {select(
                "reportingManagerId",
                managers,
                "No manager",
                (m) =>
                  fullName(usersById[idOf(m.userId)]) ||
                  `Employee #${m.id_int ?? ""}`,
                { disabled: !ready },
              )}
            </Field>
            <Field label="Status">
              <select
                className="search-box"
                style={inputStyle}
                value={form.status}
                onChange={set("status")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </Row>

          <Section title="Personal" />
          <Row>
            <Field label="Joining Date *">
              {text("joiningDate", { type: "date" })}
            </Field>
            <Field label="Date of Birth">
              {text("dateOfBirth", { type: "date" })}
            </Field>
          </Row>
          <div style={{ marginBottom: 14 }}>
            <Field label="Personal Email">
              {text("personalEmail", { type: "email" })}
            </Field>
          </div>

          <Section title="Emergency Contact" />
          <Row>
            <Field label="Name">{text("emergencyName")}</Field>
            <Field label="Phone">{text("emergencyPhone")}</Field>
            <Field label="Relation">{text("emergencyRelation")}</Field>
          </Row>

          {error && (
            <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 8,
            }}
          >
            <button type="button" onClick={onClose} className="btn">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
