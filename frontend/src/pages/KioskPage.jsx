// pages/KioskPage.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import useKioskClock from "../hooks/useKioskClock";
import { punch as punchApi } from "../services/punchService";
import "../styles/KioskPage.css";

// ---------- tiny beep helper (no asset files) ----------
function playTone(frequency, durationMs) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0.15;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    setTimeout(() => ctx.close(), durationMs + 50);
  } catch {
    // audio is a nice-to-have
  }
}
const beepOk = () => playTone(880, 150);
const beepErr = () => playTone(220, 300);
// ---------------------------------------------------------

export default function KioskPage() {
  const { time, date } = useKioskClock();

  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const resetTimerRef = useRef(null);
  const employeeInputRef = useRef(null);
  const pinInputRef = useRef(null);

  useEffect(() => {
    employeeInputRef.current?.focus();
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const resetForm = useCallback(() => {
    setEmployeeId("");
    setPin("");
    setFeedback(null);
    setBusy(false);
    employeeInputRef.current?.focus();
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetForm, 3500);
  }, [resetForm]);

  const handlePunch = async (type) => {
    if (busy) return;

    const id = employeeId.trim();
    if (!id) {
      setFeedback({
        kind: "error",
        title: "Employee ID required",
        subtitle: "Please enter your employee ID",
      });
      beepErr();
      scheduleReset();
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setFeedback({
        kind: "error",
        title: "PIN must be 4 digits",
        subtitle: "Please enter your 4-digit PIN",
      });
      beepErr();
      scheduleReset();
      return;
    }

    setBusy(true);
    try {
      const res = await punchApi({ employeeId: id, pin, type });
      const data = res?.data?.data || {};
      const name = data.employee?.name || "Employee";
      const verb = type === "in" ? "IN" : "OUT";
      const at = data.punchedAt
        ? new Date(data.punchedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "";

      setFeedback({
        kind: "success",
        title: `Welcome, ${name}`,
        subtitle: `Punched ${verb}${at ? ` at ${at}` : ""}`,
      });
      beepOk();
      scheduleReset();
    } catch (err) {
      const message =
        err?.response?.data?.message || "Punch failed. Please try again.";
      setFeedback({
        kind: "error",
        title: "Punch rejected",
        subtitle: message,
      });
      beepErr();
      scheduleReset();
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (
      e.key === "Enter" &&
      document.activeElement === employeeInputRef.current
    ) {
      pinInputRef.current?.focus();
    }
  };

  const stateClass =
    feedback?.kind === "success"
      ? "is-success"
      : feedback?.kind === "error"
        ? "is-error"
        : "";

  const hasToken = !!localStorage.getItem("accessToken");

  return (
    <div className={`kiosk-page ${stateClass}`}>
      {hasToken && (
        <button
          type="button"
          className="kiosk-exit"
          onClick={() => (window.location.href = "/dashboard")}
        >
          Exit Kiosk
        </button>
      )}

      {/* Clock */}
      <div className="kiosk-clock">
        <div className="kiosk-clock-time">{time}</div>
        <div className="kiosk-clock-date">{date}</div>
      </div>

      {/* Card */}
      <div className="kiosk-card">
        <div className="kiosk-field">
          <label className="kiosk-label" htmlFor="kiosk-employee-id">
            Employee ID
          </label>
          <input
            id="kiosk-employee-id"
            ref={employeeInputRef}
            type="text"
            autoComplete="off"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder="Paste or type your employee ID"
            className="kiosk-input"
          />
        </div>

        <div className="kiosk-field">
          <label className="kiosk-label" htmlFor="kiosk-pin">
            PIN
          </label>
          <input
            id="kiosk-pin"
            ref={pinInputRef}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder="••••"
            className="kiosk-input kiosk-input-pin"
          />
        </div>

        <div className="kiosk-buttons">
          <button
            type="button"
            disabled={busy}
            onClick={() => handlePunch("in")}
            className="kiosk-btn kiosk-btn-in"
          >
            PUNCH IN
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => handlePunch("out")}
            className="kiosk-btn kiosk-btn-out"
          >
            PUNCH OUT
          </button>
        </div>

        {feedback && (
          <div className="kiosk-feedback">
            <div className="kiosk-feedback-title">
              {feedback.kind === "success" ? "✅ " : "⚠️ "}
              {feedback.title}
            </div>
            <div className="kiosk-feedback-subtitle">{feedback.subtitle}</div>
          </div>
        )}

        {busy && !feedback && <div className="kiosk-verifying">Verifying…</div>}
      </div>

      <div className="kiosk-hint">
        Enter your employee ID, type your 4-digit PIN, then press PUNCH IN or
        PUNCH OUT. The screen resets automatically.
      </div>
    </div>
  );
}
