// src/components/GeofenceZoneFormModal.jsx
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Section, Row, Field, inputStyle } from "./FormParts";
import { isSuperAdmin, myCompanyId } from "../utils/auth";
import { listOptions } from "../services/employeeService";
import {
  createGeofenceZone,
  updateGeofenceZone,
} from "../services/geofenceService";

const idOf = (v) => v?._id || v || "";

const emptyForm = {
  companyId: "",
  name: "",
  latitude: "",
  longitude: "",
  radiusMeters: "100",
  isActive: true,
};

export default function GeofenceZoneFormModal({
  mode = "create",
  zone,
  onClose,
  onSaved,
}) {
  const isEdit = mode === "edit";
  const superAdmin = isSuperAdmin();

  const [form, setForm] = useState(() => {
    if (!isEdit || !zone)
      return { ...emptyForm, companyId: superAdmin ? "" : myCompanyId() };
    return {
      companyId: idOf(zone.companyId),
      name: zone.name || "",
      latitude: zone.latitude ?? "",
      longitude: zone.longitude ?? "",
      radiusMeters: zone.radiusMeters ?? "100",
      isActive: zone.isActive !== false,
    };
  });

  const [companies, setCompanies] = useState([]);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    if (!superAdmin) return;
    listOptions("companies")
      .then(setCompanies)
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, []);

  const fillFromMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation isn't supported by this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      (err) => {
        setError(
          err.code === 1
            ? "Location permission was denied. Allow it in your browser, or enter coordinates manually."
            : "Couldn't determine your location. Enter coordinates manually.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const coordsValid =
    form.latitude !== "" &&
    form.longitude !== "" &&
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (superAdmin && !isEdit && !form.companyId) {
      setError("Please select a company.");
      return;
    }
    if (!form.name.trim()) {
      setError("Zone name is required.");
      return;
    }
    if (!coordsValid) {
      setError(
        "Enter valid coordinates (latitude −90 to 90, longitude −180 to 180).",
      );
      return;
    }
    if (!(Number(form.radiusMeters) > 0)) {
      setError("Radius must be greater than 0 meters.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      latitude: lat,
      longitude: lng,
      radiusMeters: Number(form.radiusMeters),
      isActive: form.isActive,
    };
    if (superAdmin && !isEdit) payload.companyId = form.companyId;

    try {
      setSubmitting(true);
      const result = isEdit
        ? await updateGeofenceZone(zone._id, payload)
        : await createGeofenceZone(payload);
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
          width: 540,
          maxWidth: "95vw",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="globe" size={16} />{" "}
            {isEdit ? "Edit Geofence Zone" : "Add Geofence Zone"}
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
          <Section title="Zone" first />
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
            <Field label="Zone Name *">
              <input
                type="text"
                className="search-box"
                style={inputStyle}
                value={form.name}
                onChange={set("name")}
                placeholder="e.g. Head Office - Kathmandu"
              />
            </Field>
          </Row>

          <Section title="Location" />
          <Row>
            <Field label="Latitude *">
              <input
                type="number"
                step="any"
                className="search-box"
                style={inputStyle}
                value={form.latitude}
                onChange={set("latitude")}
                placeholder="27.7172"
              />
            </Field>
            <Field label="Longitude *">
              <input
                type="number"
                step="any"
                className="search-box"
                style={inputStyle}
                value={form.longitude}
                onChange={set("longitude")}
                placeholder="85.3240"
              />
            </Field>
          </Row>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-sm"
              onClick={fillFromMyLocation}
              disabled={locating}
            >
              <Icon name="globe" size={13} />{" "}
              {locating ? "Locating..." : "Use my current location"}
            </button>
            {coordsValid && (
              <a
                className="btn btn-sm"
                href={`https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="eye" size={13} /> Preview on map
              </a>
            )}
          </div>

          <Row>
            <Field label="Radius (meters) *">
              <input
                type="number"
                min="1"
                className="search-box"
                style={inputStyle}
                value={form.radiusMeters}
                onChange={set("radiusMeters")}
              />
            </Field>
            <Field label="Status">
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 38,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, isActive: e.target.checked }))
                  }
                />
                <span style={{ fontSize: 13.5 }}>Zone is active</span>
              </label>
            </Field>
          </Row>
          <p
            className="muted"
            style={{ fontSize: 12, marginTop: -6, marginBottom: 14 }}
          >
            Employees checking in within this radius of the coordinates are
            counted as on-site. Inactive zones are ignored for validation.
          </p>

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
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Add Zone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
