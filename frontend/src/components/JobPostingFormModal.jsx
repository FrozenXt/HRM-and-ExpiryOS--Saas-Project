import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import {
  createJobPosting,
  updateJobPosting,
} from "../services/jobPostingService";

const idOf = (v) => v?._id || v || "";

// Confirm these two enums against your backend's Mongoose schema — only
// "full_time" (employmentType) and "open" (status) were confirmed by your
// example payload/response; the rest are reasonable guesses.
const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
];
const STATUSES = ["open", "on_hold", "closed", "filled"];

const readableLabel = (v) =>
  v
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

const emptyForm = {
  companyId: "",
  title: "",
  departmentId: "",
  designationId: "",
  description: "",
  employmentType: "full_time",
  numberOfOpenings: 1,
  status: "open",
  closingDate: "",
};

export default function JobPostingFormModal({
  mode = "create",
  posting,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !posting)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(posting.companyId),
      title: posting.title || "",
      departmentId: idOf(posting.departmentId),
      designationId: idOf(posting.designationId),
      description: posting.description || "",
      employmentType: posting.employmentType || "full_time",
      numberOfOpenings: posting.numberOfOpenings ?? 1,
      status: posting.status || "open",
      closingDate: posting.closingDate?.slice(0, 10) || "",
    };
  });

  // requirements is a flat string[] on the API — edited here as one
  // textarea line-per-requirement, split/joined on submit/load.
  const [requirementsText, setRequirementsText] = useState(() =>
    (posting?.requirements || []).join("\n"),
  );

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
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

  // Department/Designation dropdowns depend on the chosen company.
  useEffect(() => {
    if (!ready) {
      setDepartments([]);
      setDesignations([]);
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("departments", scopeId),
      listOptions("designations", scopeId),
    ])
      .then(([depts, desigs]) => {
        if (!cancelled) {
          setDepartments(depts);
          setDesignations(desigs);
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
    setForm((f) => ({
      ...f,
      companyId: e.target.value,
      departmentId: "",
      designationId: "",
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.title.trim() ||
      !form.departmentId ||
      !form.designationId ||
      !form.employmentType ||
      !form.status ||
      !form.numberOfOpenings ||
      Number(form.numberOfOpenings) < 1
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const requirements = requirementsText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    const payload = {
      title: form.title.trim(),
      departmentId: form.departmentId,
      designationId: form.designationId,
      description: form.description.trim(),
      requirements,
      employmentType: form.employmentType,
      numberOfOpenings: Number(form.numberOfOpenings),
      status: form.status,
      closingDate: form.closingDate || undefined,
    };
    if (superAdmin) payload.companyId = form.companyId; // backend resolves it for company admins

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateJobPosting(posting._id, payload)
        : await createJobPosting(payload);
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
          width: 640,
          maxWidth: "95vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="briefcase" size={16} />{" "}
            {isEdit ? "Edit Job Posting" : "New Job Posting"}
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
            <Field label="Job Title *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.title}
                onChange={set("title")}
                placeholder="e.g. Senior Backend Engineer"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Department *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.departmentId}
                onChange={set("departmentId")}
                disabled={!ready}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select department"}
                </option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Designation *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.designationId}
                onChange={set("designationId")}
                disabled={!ready}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select designation"}
                </option>
                {designations.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          </Row>

          <Section title="Details" />
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12.5,
                color: "var(--text-dim)",
              }}
            >
              Description
            </label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={form.description}
              onChange={set("description")}
              placeholder="Role summary, responsibilities..."
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 12.5,
                color: "var(--text-dim)",
              }}
            >
              Requirements (one per line)
            </label>
            <textarea
              className="search-box"
              style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              placeholder={"3+ years Node.js experience\nStrong MongoDB skills"}
            />
          </div>

          <Section title="Hiring Info" />
          <Row>
            <Field label="Employment Type *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.employmentType}
                onChange={set("employmentType")}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {readableLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Number of Openings *">
              <input
                type="number"
                min="1"
                className="search-box"
                style={inputStyle}
                value={form.numberOfOpenings}
                onChange={set("numberOfOpenings")}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Status *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.status}
                onChange={set("status")}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {readableLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Closing Date">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.closingDate}
                onChange={set("closingDate")}
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
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Post Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
