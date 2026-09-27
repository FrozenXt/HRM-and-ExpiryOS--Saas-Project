import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { createAssetAssignment } from "../services/assetService";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");

const emptyForm = {
  companyId: "",
  assetId: "",
  employeeId: "",
  assignedDate: new Date().toISOString().slice(0, 10),
};

export default function AssignAssetModal({ presetAsset, onClose, onSaved }) {
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => ({
    ...emptyForm,
    companyId: superAdmin ? idOf(presetAsset?.companyId) || "" : myCompanyId(),
    assetId: presetAsset?._id || "",
  }));

  const [companies, setCompanies] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
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

  useEffect(() => {
    if (!ready) {
      setAssets([]);
      setUsers([]);
      setEmployees([]);
      return;
    }
    let cancelled = false;
    setLoadingLookups(true);
    Promise.all([
      listOptions("assets", scopeId),
      listOptions("users", scopeId),
      listOptions("employees", scopeId),
    ])
      .then(([a, u, e]) => {
        if (!cancelled) {
          setAssets(a);
          setUsers(u);
          setEmployees(e);
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

  const usersById = useMemo(
    () => Object.fromEntries(users.map((u) => [u._id, u])),
    [users],
  );

  // Only assets currently "available" — the backend enforces this anyway,
  // but hiding unavailable ones up front avoids a guaranteed 400 on submit.
  const availableAssets = useMemo(
    () =>
      assets.filter((a) => a.status === "available" || a._id === form.assetId),
    [assets, form.assetId],
  );

  const onCompanyChange = (e) =>
    setForm((f) => ({
      ...f,
      companyId: e.target.value,
      assetId: "",
      employeeId: "",
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.assetId ||
      !form.employeeId ||
      !form.assignedDate
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      assetId: form.assetId,
      employeeId: form.employeeId,
      assignedDate: form.assignedDate,
    };
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSubmitting(true);
      const result = await createAssetAssignment(payload);
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
            <Icon name="userPlus" size={16} /> Assign Asset
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
                  disabled={!!presetAsset}
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
            <Field label="Asset *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.assetId}
                onChange={set("assetId")}
                disabled={!ready || !!presetAsset}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select asset"}
                </option>
                {availableAssets.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.assetTag} — {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Employee *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.employeeId}
                onChange={set("employeeId")}
                disabled={!ready}
              >
                <option value="">
                  {!ready
                    ? "Select a company first"
                    : loadingLookups
                      ? "Loading..."
                      : "Select employee"}
                </option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {fullName(usersById[idOf(emp.userId)]) ||
                      `Employee #${emp.id_int ?? ""}`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assigned Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.assignedDate}
                onChange={set("assignedDate")}
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
              {submitting ? "Assigning..." : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
