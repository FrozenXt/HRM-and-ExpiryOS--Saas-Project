import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import {
  createStatutoryDetail,
  updateStatutoryDetail,
} from "../services/statutoryDetailService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

const emptyForm = {
  companyId: "",
  employeeId: "",
  panNumber: "",
  uanNumber: "",
  pfNumber: "",
  esiNumber: "",
  ifscCode: "",
  bankName: "",
};

export default function StatutoryDetailFormModal({
  mode = "create",
  detail,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !detail)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(detail.companyId),
      employeeId: idOf(detail.employeeId),
      panNumber: detail.panNumber || "",
      uanNumber: detail.uanNumber || "",
      pfNumber: detail.pfNumber || "",
      esiNumber: detail.esiNumber || "",
      ifscCode: detail.ifscCode || "",
      bankName: detail.bankName || "",
    };
  });

  // aadhaarNumber/bankAccountNumber are select:false and only ever returned
  // masked (e.g. "****5678") — the real value never round-trips back to the
  // client. So on edit these start blank; leaving them blank means "keep the
  // existing value," matching the SMTP password pattern in Settings.jsx.
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");

  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [existingDetails, setExistingDetails] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const ready = superAdmin ? !!form.companyId : true;
  const scopeId = superAdmin ? form.companyId : undefined;

  // Employees + their existing statutory records (to hide employees who
  // already have one, since the API enforces one record per employee).
  useEffect(() => {
    if (!ready) {
      setUsers([]);
      setEmployees([]);
      setExistingDetails([]);
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("users", scopeId),
      listOptions("employees", scopeId),
      listOptions("employee-statutory-details", scopeId),
    ])
      .then(([u, e, details]) => {
        if (!cancelled) {
          setUsers(u);
          setEmployees(e);
          setExistingDetails(details);
        }
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
    setForm((f) => ({ ...f, companyId: e.target.value, employeeId: "" }));

  const usersById = Object.fromEntries(users.map((u) => [u._id, u]));

  const availableEmployees = employees.filter((emp) => {
    const taken = existingDetails.some(
      (d) => String(idOf(d.employeeId)) === String(emp._id),
    );
    return emp._id === form.employeeId || !taken;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.employeeId ||
      !form.bankName.trim() ||
      (!isEdit && !bankAccountNumber.trim())
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      panNumber: form.panNumber || undefined,
      uanNumber: form.uanNumber || undefined,
      pfNumber: form.pfNumber || undefined,
      esiNumber: form.esiNumber || undefined,
      ifscCode: form.ifscCode || undefined,
      bankName: form.bankName.trim(),
    };
    // Only send these if the user actually typed something — an empty
    // string would otherwise overwrite the real stored value with blank.
    if (aadhaarNumber.trim()) payload.aadhaarNumber = aadhaarNumber.trim();
    if (bankAccountNumber.trim())
      payload.bankAccountNumber = bankAccountNumber.trim();

    if (!isEdit) {
      payload.employeeId = form.employeeId;
      if (superAdmin) payload.companyId = form.companyId; // backend resolves it for company admins
    }

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateStatutoryDetail(detail._id, payload)
        : await createStatutoryDetail(payload);
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
          width: 600,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="fileText" size={16} />{" "}
            {isEdit ? "Edit Statutory Details" : "Add Statutory Details"}
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
            <Field label="Employee *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.employeeId}
                onChange={set("employeeId")}
                disabled={isEdit || !ready}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select employee"}
                </option>
                {availableEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {fullName(usersById[idOf(emp.userId)]) ||
                      `Employee #${emp.id_int ?? ""}`}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          <Section title="Tax & Statutory IDs" />
          <Row>
            <Field label="PAN Number">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.panNumber}
                onChange={set("panNumber")}
              />
            </Field>
            <Field
              label={`Aadhaar Number${isEdit ? "" : " *"}`}
              hint={
                isEdit ? "Leave blank to keep the existing value" : undefined
              }
            >
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                placeholder={isEdit ? detail?.aadhaarNumber || "" : ""}
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="UAN Number">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.uanNumber}
                onChange={set("uanNumber")}
              />
            </Field>
            <Field label="PF Number">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.pfNumber}
                onChange={set("pfNumber")}
              />
            </Field>
          </Row>
          <Row>
            <Field label="ESI Number">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.esiNumber}
                onChange={set("esiNumber")}
              />
            </Field>
          </Row>

          <Section title="Bank Details" />
          <Row>
            <Field label="Bank Name *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.bankName}
                onChange={set("bankName")}
              />
            </Field>
            <Field label="IFSC Code">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.ifscCode}
                onChange={set("ifscCode")}
              />
            </Field>
          </Row>
          <Row>
            <Field
              label={`Bank Account Number${isEdit ? "" : " *"}`}
              hint={
                isEdit ? "Leave blank to keep the existing value" : undefined
              }
            >
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                placeholder={isEdit ? detail?.bankAccountNumber || "" : ""}
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
              />
            </Field>
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
                  : "Add Details"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
