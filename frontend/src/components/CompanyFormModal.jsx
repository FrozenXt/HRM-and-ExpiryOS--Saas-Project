import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { createCompany, updateCompany } from "../services/companyService";
import { uploadLogo, assetUrl } from "../services/uploadService";
import {
  useCompanyLookups,
  COUNTRIES,
  planLabel,
  currencyLabel,
} from "../hooks/useCompanyLookups";

const emptyForm = {
  legalName: "",
  tradeName: "",
  registrationNumber: "",
  taxId: "",
  industry: "",
  foundedDate: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactDesignation: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "Nepal",
  postalCode: "",
  countryCode: "NP",
  currencyId: "",
  planId: "",
  billingEmail: "",
  employeeLimit: "",
  subscriptionStatus: "active",
  subscriptionStartDate: "",
  subscriptionEndDate: "",
  logoUrl: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
  adminPassword: "",
};

/* ---------- small layout helpers (defined outside so inputs keep focus) ---------- */
const inputStyle = { width: "100%", padding: "9px 12px" };
const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12.5,
  color: "var(--text-dim)",
};

const Section = ({ title, first }) => (
  <div
    className="nav-section-title"
    style={{ padding: 0, margin: first ? "0 0 10px" : "18px 0 10px" }}
  >
    {title}
  </div>
);

const Row = ({ children }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>{children}</div>
);

const Field = ({ label, children }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

export default function CompanyFormModal({
  mode = "create",
  company,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(() => {
    if (!isEdit || !company) return emptyForm;
    return {
      ...emptyForm,
      legalName: company.legalName || "",
      tradeName: company.tradeName || "",
      registrationNumber: company.registrationNumber || "",
      taxId: company.taxId || "",
      industry: company.industry || "",
      foundedDate: company.foundedDate?.slice(0, 10) || "",
      contactName: company.contactPerson?.name || "",
      contactEmail: company.contactPerson?.email || "",
      contactPhone: company.contactPerson?.phone || "",
      contactDesignation: company.contactPerson?.designation || "",
      addressLine1: company.address?.line1 || "",
      addressLine2: company.address?.line2 || "",
      city: company.address?.city || "",
      state: company.address?.state || "",
      country: company.address?.country || "Nepal",
      postalCode: company.address?.postalCode || "",
      countryCode: company.country || "NP",
      currencyId: company.currencyId || "",
      planId: company.planId || "",
      billingEmail: company.billingEmail || "",
      employeeLimit: company.employeeLimit || "",
      subscriptionStatus: company.subscriptionStatus || "active",
      subscriptionStartDate: company.subscriptionStartDate?.slice(0, 10) || "",
      subscriptionEndDate: company.subscriptionEndDate?.slice(0, 10) || "",
      logoUrl: company.logoUrl || "",
    };
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    plans,
    currencies,
    loading: lookupsLoading,
    currencyIdForCountry,
    planIdForLimit,
  } = useCompanyLookups();

  // Once the user picks a plan by hand (or when editing), stop auto-picking one.
  const [planTouched, setPlanTouched] = useState(isEdit);

  // New company: pre-select the default country's currency once currencies load.
  useEffect(() => {
    if (!isEdit && currencies.length) {
      setForm((f) =>
        f.currencyId
          ? f
          : { ...f, currencyId: currencyIdForCountry(f.country) },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencies]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const [uploading, setUploading] = useState(false);

  const onLogoPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }

    try {
      setError("");
      setUploading(true);
      const url = await uploadLogo(file);
      setForm((f) => ({ ...f, logoUrl: url }));
    } catch (err) {
      setError(err.response?.data?.message || "Logo upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onCountryChange = (e) => {
    const country = COUNTRIES.find((c) => c.name === e.target.value);
    if (!country) return;
    setForm((f) => ({
      ...f,
      country: country.name,
      countryCode: country.code,
      currencyId: currencyIdForCountry(country.name) || f.currencyId,
    }));
  };

  const onLimitChange = (e) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      employeeLimit: value,
      planId: planTouched ? f.planId : planIdForLimit(value) || f.planId,
    }));
  };

  const onPlanChange = (e) => {
    setPlanTouched(true);
    set("planId")(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.legalName ||
      !form.registrationNumber ||
      !form.contactEmail ||
      !form.currencyId ||
      !form.planId
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    if (
      !isEdit &&
      (!form.adminFirstName || !form.adminEmail || !form.adminPassword)
    ) {
      setError(
        "Admin first name, email, and password are required to create a company.",
      );
      return;
    }

    const payload = {
      legalName: form.legalName,
      tradeName: form.tradeName,
      registrationNumber: form.registrationNumber,
      taxId: form.taxId,
      industry: form.industry,
      foundedDate: form.foundedDate,
      contactPerson: {
        name: form.contactName,
        email: form.contactEmail,
        phone: form.contactPhone,
        designation: form.contactDesignation,
      },
      address: {
        line1: form.addressLine1,
        line2: form.addressLine2,
        city: form.city,
        state: form.state,
        country: form.country,
        postalCode: form.postalCode,
      },
      country: form.countryCode,
      currencyId: form.currencyId,
      planId: form.planId,
      billingEmail: form.billingEmail,
      employeeLimit: Number(form.employeeLimit) || 0,
      subscriptionStatus: form.subscriptionStatus,
      subscriptionStartDate: form.subscriptionStartDate,
      subscriptionEndDate: form.subscriptionEndDate,
      logoUrl: form.logoUrl,
    };

    if (!isEdit) {
      payload.admin = {
        firstName: form.adminFirstName,
        lastName: form.adminLastName,
        email: form.adminEmail,
        password: form.adminPassword,
        mustResetPassword: true,
      };
    }

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateCompany(company._id, payload)
        : await createCompany(payload);
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
            <Icon name="building" size={16} />{" "}
            {isEdit ? "Edit Company" : "Add Company"}
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
          <Section title="Company Details" first />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                border: "1px dashed var(--border)",
                background: "var(--surface-2)",
                display: "grid",
                placeItems: "center",
                overflow: "hidden",
                color: "var(--text-dim)",
                flexShrink: 0,
              }}
            >
              {form.logoUrl ? (
                <img
                  src={assetUrl(form.logoUrl)}
                  alt="Company logo"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Icon name="building" size={24} />
              )}
            </div>
            <div>
              <div style={{ display: "flex", gap: 8 }}>
                <label
                  className="btn btn-sm"
                  style={{ cursor: uploading ? "wait" : "pointer" }}
                >
                  {uploading
                    ? "Uploading..."
                    : form.logoUrl
                      ? "Change logo"
                      : "Upload logo"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={onLogoPick}
                    disabled={uploading}
                    hidden
                  />
                </label>
                {form.logoUrl && (
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                PNG, JPG or WEBP, up to 2 MB.
              </div>
            </div>
          </div>
          <Row>
            <Field label="Legal Name *">{text("legalName")}</Field>
            <Field label="Trade Name">{text("tradeName")}</Field>
          </Row>
          <Row>
            <Field label="Registration Number *">
              {text("registrationNumber")}
            </Field>
            <Field label="Tax ID">{text("taxId")}</Field>
          </Row>
          <Row>
            <Field label="Industry">{text("industry")}</Field>
            <Field label="Founded Date">
              {text("foundedDate", { type: "date" })}
            </Field>
          </Row>

          <Section title="Contact Person" />
          <Row>
            <Field label="Name">{text("contactName")}</Field>
            <Field label="Designation">{text("contactDesignation")}</Field>
          </Row>
          <Row>
            <Field label="Email *">
              {text("contactEmail", { type: "email" })}
            </Field>
            <Field label="Phone">{text("contactPhone")}</Field>
          </Row>

          <Section title="Address" />
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Address Line 1</label>
            {text("addressLine1")}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Address Line 2</label>
            {text("addressLine2")}
          </div>
          <Row>
            <Field label="City">{text("city")}</Field>
            <Field label="State">{text("state")}</Field>
          </Row>
          <Row>
            <Field label="Country">
              <select
                className="search-box"
                style={inputStyle}
                value={form.country}
                onChange={onCountryChange}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Postal Code">{text("postalCode")}</Field>
          </Row>

          <Section title="Subscription" />
          <Row>
            <Field label="Employee Limit">
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.employeeLimit}
                onChange={onLimitChange}
              />
            </Field>
            <Field label="Plan *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.planId}
                onChange={onPlanChange}
              >
                <option value="">
                  {lookupsLoading ? "Loading..." : "Select plan"}
                </option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {planLabel(p)}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Currency *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.currencyId}
                onChange={set("currencyId")}
              >
                <option value="">
                  {lookupsLoading ? "Loading..." : "Select currency"}
                </option>
                {currencies.map((c) => (
                  <option key={c._id} value={c._id}>
                    {currencyLabel(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subscription Status">
              <select
                className="search-box"
                style={inputStyle}
                value={form.subscriptionStatus}
                onChange={set("subscriptionStatus")}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Subscription Start">
              {text("subscriptionStartDate", { type: "date" })}
            </Field>
            <Field label="Subscription End">
              {text("subscriptionEndDate", { type: "date" })}
            </Field>
          </Row>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Billing Email</label>
            {text("billingEmail", { type: "email" })}
          </div>

          {!isEdit && (
            <>
              <Section title="Admin User (first login for this company)" />
              <Row>
                <Field label="First Name *">{text("adminFirstName")}</Field>
                <Field label="Last Name">{text("adminLastName")}</Field>
              </Row>
              <Row>
                <Field label="Admin Email *">
                  {text("adminEmail", { type: "email" })}
                </Field>
                <Field label="Temp Password *">
                  {text("adminPassword", { type: "text" })}
                </Field>
              </Row>
            </>
          )}

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
            <button
              type="submit"
              disabled={submitting || uploading}
              className="btn primary"
            >
              {submitting
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
