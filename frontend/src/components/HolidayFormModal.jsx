import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { createHoliday, updateHoliday } from "../services/holidayService";

const idOf = (v) => v?._id || v || "";

const emptyForm = {
  companyId: "",
  date: "",
  name: "",
};

export default function HolidayFormModal({
  mode = "create",
  holiday,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !holiday)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(holiday.companyId),
      date: holiday.date?.slice(0, 10) || "",
      name: holiday.name || "",
    };
  });

  const [companies, setCompanies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Companies for the dropdown — super admin only.
  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if ((superAdmin && !form.companyId) || !form.date || !form.name.trim()) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      date: form.date,
      name: form.name.trim(),
    };
    if (superAdmin) payload.companyId = form.companyId; // ignored server-side for admin/hr

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateHoliday(holiday._id, payload)
        : await createHoliday(payload);
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
          width: 480,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="calendar" size={16} />{" "}
            {isEdit ? "Edit Holiday" : "Add Holiday"}
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
          <Section title="Holiday Details" first />
          {superAdmin && (
            <Row>
              <Field label="Company *">
                <select
                  className="search-box"
                  style={inputStyle}
                  value={form.companyId}
                  onChange={set("companyId")}
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
            </Row>
          )}
          <Row>
            <Field label="Holiday Name *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Dashain"
              />
            </Field>
            <Field label="Date *">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.date}
                onChange={set("date")}
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
                  : "Add Holiday"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
