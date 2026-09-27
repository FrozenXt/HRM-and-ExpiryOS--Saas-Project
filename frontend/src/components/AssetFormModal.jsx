import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import { createAsset, updateAsset } from "../services/assetService";

const idOf = (v) => v?._id || v || "";

const CATEGORIES = ["laptop", "mobile", "accessory", "furniture", "other"];
const STATUSES = ["available", "assigned", "under_repair", "retired"];

const readableLabel = (v = "") =>
  v
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

const emptyForm = {
  companyId: "",
  assetTag: "",
  name: "",
  category: "laptop",
  serialNumber: "",
  purchaseDate: "",
  purchaseCost: "",
  status: "available",
};

export default function AssetFormModal({
  mode = "create",
  asset,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !asset)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(asset.companyId),
      assetTag: asset.assetTag || "",
      name: asset.name || "",
      category: asset.category || "laptop",
      serialNumber: asset.serialNumber || "",
      purchaseDate: asset.purchaseDate?.slice(0, 10) || "",
      purchaseCost: asset.purchaseCost ?? "",
      status: asset.status || "available",
    };
  });

  const [companies, setCompanies] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      (superAdmin && !form.companyId) ||
      !form.assetTag.trim() ||
      !form.name.trim() ||
      !form.category
    ) {
      setError("Please fill in all required fields (marked *).");
      return;
    }

    const payload = {
      assetTag: form.assetTag.trim(),
      name: form.name.trim(),
      category: form.category,
      serialNumber: form.serialNumber || undefined,
      purchaseDate: form.purchaseDate || undefined,
      purchaseCost:
        form.purchaseCost === "" ? undefined : Number(form.purchaseCost),
      status: form.status,
    };
    if (superAdmin) payload.companyId = form.companyId;

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateAsset(asset._id, payload)
        : await createAsset(payload);
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
          width: 560,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="briefcase" size={16} />{" "}
            {isEdit ? "Edit Asset" : "Add Asset"}
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
          <Section title="Asset Details" first />
          <Row>
            {superAdmin && (
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
            )}
            <Field label="Asset Tag *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.assetTag}
                onChange={set("assetTag")}
                placeholder="e.g. LAP-001"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Name *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Dell Latitude 5420"
              />
            </Field>
            <Field label="Category *">
              <select
                className="search-box"
                style={inputStyle}
                value={form.category}
                onChange={set("category")}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {readableLabel(c)}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Row>
            <Field label="Serial Number">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.serialNumber}
                onChange={set("serialNumber")}
              />
            </Field>
            <Field label="Purchase Date">
              <input
                type="date"
                className="search-box"
                style={inputStyle}
                value={form.purchaseDate}
                onChange={set("purchaseDate")}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Purchase Cost">
              <input
                type="number"
                min="0"
                className="search-box"
                style={inputStyle}
                value={form.purchaseCost}
                onChange={set("purchaseCost")}
              />
            </Field>
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
          </Row>

          {isEdit &&
            asset?.status === "assigned" &&
            form.status !== "assigned" && (
              <p
                className="muted"
                style={{
                  fontSize: 12,
                  marginTop: -6,
                  marginBottom: 14,
                  color: "var(--red)",
                }}
              >
                This asset currently has an active assignment. Changing status
                here won't automatically return it — use "Mark Returned" on the
                assignment record instead.
              </p>
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
            <button type="submit" disabled={submitting} className="btn primary">
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Asset"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
