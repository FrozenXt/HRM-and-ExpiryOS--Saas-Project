import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import ConsentModal from "./ConsentModal";
import { getMyConsent } from "../services/monitoringService";

const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export default function MyConsentCard({ onChanged }) {
  const [state, setState] = useState({
    loading: true,
    hasConsented: false,
    consent: null,
    noProfile: false,
    error: "",
  });
  const [modal, setModal] = useState(null); // "grant" | "revoke" | null

  const load = async () => {
    try {
      const res = await getMyConsent();
      const { hasConsented, consent } = res.data.data;
      setState({
        loading: false,
        hasConsented,
        consent,
        noProfile: false,
        error: "",
      });
    } catch (err) {
      setState({
        loading: false,
        hasConsented: false,
        consent: null,
        noProfile: err.response?.status === 404,
        error:
          err.response?.status === 404
            ? ""
            : err.response?.data?.message || err.message,
      });
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (state.loading || state.noProfile) return null;

  const { hasConsented, consent } = state;
  const revoked = !!consent && !consent.consentGiven;

  const badge = hasConsented
    ? { cls: "success", label: "Consent given" }
    : revoked
      ? { cls: "warning", label: "Consent revoked" }
      : { cls: "plan-default", label: "Not yet given" };

  return (
    <>
      <section className="panel" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <div className={`stat-icon ${hasConsented ? "green" : "orange"}`}>
              <Icon name="shield" size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                My monitoring consent{" "}
                <span
                  className={`badge ${badge.cls}`}
                  style={{ marginLeft: 6 }}
                >
                  {badge.label}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {consent
                  ? `Last updated ${formatDateTime(consent.consentDate)} · policy ${consent.policyVersion}`
                  : "Screenshot capture from your device stays off until you give consent."}
              </div>
            </div>
          </div>

          {hasConsented ? (
            <button
              className="btn btn-sm btn-danger"
              onClick={() => setModal("revoke")}
            >
              Revoke consent
            </button>
          ) : (
            <button
              className="btn btn-sm primary"
              onClick={() => setModal("grant")}
            >
              Give consent
            </button>
          )}
        </div>
        {state.error && (
          <div
            style={{
              color: "var(--red)",
              fontSize: 13,
              padding: "0 20px 14px",
            }}
          >
            {state.error}
          </div>
        )}
      </section>

      {modal && (
        <ConsentModal
          mode={modal}
          onClose={() => setModal(null)}
          onSaved={() => {
            load();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
