import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Row, Field, inputStyle, labelStyle } from "./FormParts";
import {
  createLeaveRequest,
  updateLeaveRequest,
} from "../services/leaveRequestService";
import { listOptions } from "../services/employeeService";
import { getCurrentUser } from "../utils/auth";

const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const idOf = (v) => v?._id || v || "";

export default function LeaveRequestFormModal({
  mode = "create",
  leaveRequest,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit" && !!leaveRequest;
  const role = getCurrentUser()?.role || "";
  const superAdmin = role === "super_admin";
  const staff = role === "staff";

  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState({});
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState(() =>
    isEdit && leaveRequest
      ? {
          companyId: idOf(leaveRequest.companyId),
          employeeId: idOf(leaveRequest.employeeId),
          leaveTypeId: idOf(leaveRequest.leaveTypeId),
          fromDate: leaveRequest.fromDate?.slice(0, 10) || "",
          toDate: leaveRequest.toDate?.slice(0, 10) || "",
          reason: leaveRequest.reason || "",
        }
      : {
          companyId: "",
          employeeId: "",
          leaveTypeId: "",
          fromDate: "",
          toDate: "",
          reason: "",
        },
  );

  // Leave types (+ companies for super admin)
  useEffect(() => {
    setLoadingOptions(true);
    Promise.all([
      listOptions("leave-types"),
      superAdmin ? listOptions("companies") : Promise.resolve([]),
    ])
      .then(([types, comps]) => {
        setLeaveTypes(types || []);
        if (superAdmin) setCompanies(comps || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoadingOptions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [superAdmin]);

  // Employees to pick from (admin/hr: own company; super admin: chosen company). Staff never sees this.
  useEffect(() => {
    if (isEdit || staff) return;
    if (superAdmin && !form.companyId) {
      setEmployees([]);
      return;
    }
    Promise.all([
      listOptions("employees", superAdmin ? form.companyId : undefined),
      listOptions("users", superAdmin ? form.companyId : undefined),
    ])
      .then(([emps, usrs]) => {
        setEmployees(emps || []);
        setUsers(Object.fromEntries((usrs || []).map((u) => [u._id, u])));
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [superAdmin, staff, isEdit, form.companyId]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const handleCompanyChange = (e) =>
    setForm((f) => ({ ...f, companyId: e.target.value, employeeId: "" }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (superAdmin && !form.companyId)
      return setError("Please select a company.");
    if (!staff && !form.employeeId)
      return setError("Please select an employee.");
    if (!form.leaveTypeId) return setError("Please select a leave type.");
    if (!form.fromDate || !form.toDate)
      return setError("From and to date are required.");
    if (new Date(form.fromDate) > new Date(form.toDate))
      return setError("From date cannot be after to date.");

    const payload = {
      leaveTypeId: form.leaveTypeId,
      fromDate: form.fromDate,
      toDate: form.toDate,
      reason: form.reason.trim(),
    };
    if (superAdmin) {
      payload.companyId = form.companyId;
      payload.employeeId = form.employeeId;
    } else if (!staff) {
      payload.employeeId = form.employeeId; // admin/hr filing on behalf of someone
    }
    // staff: no employeeId/companyId sent — backend resolves it to their own profile

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateLeaveRequest(leaveRequest._id, payload)
        : await createLeaveRequest(payload);
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
          width: 520,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="calendar" size={16} />{" "}
            {isEdit ? "Edit Leave Request" : "Request Leave"}
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
          {superAdmin && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Company *</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.companyId}
                onChange={handleCompanyChange}
                disabled={submitting || isEdit}
              >
                <option value="">Select company</option>
                {companies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.legalName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!isEdit && !staff && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Employee *</label>
              <select
                className="search-box"
                style={inputStyle}
                value={form.employeeId}
                onChange={set("employeeId")}
                disabled={
                  submitting ||
                  loadingOptions ||
                  (superAdmin && !form.companyId)
                }
              >
                <option value="">
                  {superAdmin && !form.companyId
                    ? "Select company first"
                    : "Select employee"}
                </option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {fullName(users[idOf(emp.userId)]) ||
                      `Employee #${emp.id_int ?? ""}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Row>
            <Field label="Leave Type *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.leaveTypeId}
                onChange={set("leaveTypeId")}
                disabled={submitting || loadingOptions}
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => (
                  <option key={lt._id} value={lt._id}>
                    {lt.name}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="From Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.fromDate}
                onChange={set("fromDate")}
                disabled={submitting}
              />
            </Field>
            <Field label="To Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.toDate}
                onChange={set("toDate")}
                disabled={submitting}
              />
            </Field>
          </Row>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Reason</label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={form.reason}
              onChange={set("reason")}
              placeholder="Enter reason for leave"
              disabled={submitting}
            />
          </div>

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
            <button
              type="button"
              onClick={onClose}
              className="btn"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={submitting || loadingOptions}
            >
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
