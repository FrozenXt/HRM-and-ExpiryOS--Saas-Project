import { useState } from "react";
import { Icon } from "../components/Icon";
import MyConsentCard from "../components/MyConsentCard";
import ScreenshotsTab from "../components/ScreenshotsTab";
import MonitoringConsentsTab from "../components/MonitoringConsentsTab";
import { getCurrentUser } from "../utils/auth";

const TABS = [
  { key: "screenshots", label: "Screenshots", icon: "eye" },
  { key: "consents", label: "Consent Records", icon: "shield" },
];

export default function Monitoring() {
  const isStaff = getCurrentUser()?.role === "staff";
  const [tab, setTab] = useState("screenshots");
  // Bumped when the user gives/revokes consent so the records tab refetches.
  const [consentVersion, setConsentVersion] = useState(0);

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Monitoring</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Monitoring</h1>
          <p>
            {isStaff
              ? "Manage your monitoring consent and review the screenshots captured from your device."
              : "Review captured screenshots and track employee monitoring consent."}
          </p>
        </div>
      </div>

      <MyConsentCard onChanged={() => setConsentVersion((v) => v + 1)} />

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${tab === t.key ? "primary" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <Icon name={t.icon} size={15} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "screenshots" && <ScreenshotsTab />}
      {tab === "consents" && <MonitoringConsentsTab key={consentVersion} />}
    </>
  );
}
