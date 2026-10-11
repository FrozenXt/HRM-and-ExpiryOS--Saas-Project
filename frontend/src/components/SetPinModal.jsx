import { useState } from "react";
import { Icon } from "./Icon";
import { Field, inputStyle } from "./FormParts";
import { setEmployeePin } from "../services/attendancePinService";

// Cryptographically random 4-digit PIN, avoiding trivial ones like 0000/1234.
const generatePin = () => {
  const bad = new Set([
    "0000",
    "1111",
    "2222",
    "3333",
    "4444",
    "5555",
    "6666",
    "7777",
    "8888",
    "9999",
    "1234",
    "4321",
  ]);
  let pin;
  do {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 10000;
    pin = String(n).padStart(4, "0");
  } while (bad.has(pin));
  return pin;
};

export default function SetPinModal({ employee, name, onClose }) {
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedPin, setSavedPin] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    try {
      setSaving(true);
      await setEmployeePin(employee._id, pin);
      setSavedPin(pin);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Could not set PIN",
      );
    } finally {
      setSaving(false);
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
        style={{ width: 420, maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <h2>
            <Icon name="users" size={16} /> Attendance PIN
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

        {savedPin ? (
          <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
            <p className="muted" style={{ marginBottom: 10 }}>
              PIN saved for <strong>{name}</strong>. Share it privately. It
              cannot be viewed again after you close this.
            </p>
            <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 10 }}>
              {savedPin}
            </div>
            <div style={{ marginTop: 20 }}>
              <button type="button" className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
              Set or reset the 4-digit PIN <strong>{name}</strong> uses to check
              in from the mobile app. Setting a new PIN also unlocks the
              employee if they were locked out.
            </p>

            <Field label="4-digit PIN *">
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="search-box"
                  style={{ ...inputStyle, letterSpacing: 6, fontSize: 18 }}
                  value={pin}
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  onChange={(e) =>
                    setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                />
                <button
                  type="button"
                  className="btn"
                  onClick={() => setPin(generatePin())}
                >
                  Generate
                </button>
              </div>
            </Field>

            {error && (
              <p
                style={{
                  color: "var(--red)",
                  fontSize: 13,
                  margin: "12px 0 0",
                }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 18,
              }}
            >
              <button type="button" className="btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={saving}>
                {saving ? "Saving..." : "Save PIN"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
