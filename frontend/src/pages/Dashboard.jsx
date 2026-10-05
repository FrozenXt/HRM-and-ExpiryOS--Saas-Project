import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import PlatformDashboard from "./dashboard/PlatformDashboard";
import CompanyDashboard from "./dashboard/CompanyDashboard";
import StaffDashboard from "./dashboard/StaffDashboard";
import { getAdminDashboard } from "../services/dashboardService";
import { listOptions } from "../services/employeeService";
import { getCurrentUser } from "../utils/auth";

export default function Dashboard() {
  const role = getCurrentUser()?.role || "";
  const staff = role === "staff";
  const superAdmin = role === "super_admin";

  const [data, setData] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (companyId) => {
    try {
      setLoading(true);
      setError("");
      const res = await getAdminDashboard(companyId);
      setData(res.data.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  };

  // All hooks run unconditionally, every render — the staff early-return
  // happens only after every hook below has been called.
  useEffect(() => {
    if (staff) return; // StaffDashboard fetches its own data (with its own month/year state)
    load(selectedCompanyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (superAdmin)
      listOptions("companies")
        .then(setCompanies)
        .catch(() => {});
  }, [superAdmin]);

  const selectCompany = (id) => {
    setSelectedCompanyId(id);
    load(id);
  };

  // Staff has its own self-contained component (own loading/error/fetch) —
  // render it and skip this file's admin/platform state entirely.
  if (staff) return <StaffDashboard />;

  if (loading)
    return (
      <div className="muted" style={{ padding: "40px 0" }}>
        Loading dashboard...
      </div>
    );
  if (error) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ color: "var(--red)", marginBottom: 14 }}>{error}</div>
        <button className="btn" onClick={() => load(selectedCompanyId)}>
          <Icon name="activity" size={14} /> Retry
        </button>
      </div>
    );
  }
  if (!data) return null;

  if (data.scope === "platform") {
    return (
      <PlatformDashboard
        data={data}
        companies={companies}
        onSelectCompany={selectCompany}
      />
    );
  }

  // scope === "company" — admin/hr, or super_admin after picking a company
  return (
    <>
      {superAdmin && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 10,
          }}
        >
          <button
            className="btn btn-sm"
            onClick={() => {
              setSelectedCompanyId("");
              load("");
            }}
          >
            <Icon name="chevronLeft" size={13} /> Back to platform overview
          </button>
        </div>
      )}
      <CompanyDashboard data={data} />
    </>
  );
}
