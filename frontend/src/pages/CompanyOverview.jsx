import { useEffect, useState } from "react";
import { Icon } from "../components/Icon";
import { getMyCompany } from "../services/companyService";
import { getEmployees } from "../services/employeeService";
import { getAttendance } from "../services/attendanceService"; // adjust the export name if yours differs
import { getHolidays } from "../services/holidayService";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const StatCard = ({ tone, icon, label, value }) => (
  <div className="stat-card">
    <div className={`stat-icon ${tone}`}>
      <Icon name={icon} size={22} />
    </div>
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  </div>
);

export default function CompanyOverview() {
  const [company, setCompany] = useState(null);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [companyRes, employeesRes, attendanceRes, holidaysRes] =
          await Promise.all([
            getMyCompany(),
            getEmployees({
              limit: 1,
              fields: [{ field: "status", operator: "eq", value: "active" }],
            }),
            getAttendance({
              limit: 1,
              fields: [
                {
                  field: "date",
                  operator: "gte",
                  value: todayStart.toISOString(),
                },
                {
                  field: "date",
                  operator: "lte",
                  value: todayEnd.toISOString(),
                },
                { field: "status", operator: "eq", value: "present" },
              ],
            }),
            getHolidays({
              limit: 5,
              sort: "ASC",
              sort_field: "date",
              fields: [
                {
                  field: "date",
                  operator: "gte",
                  value: todayStart.toISOString(),
                },
              ],
            }),
          ]);

        if (cancelled) return;
        setCompany(companyRes.data.data);
        setTotalEmployees(employeesRes.data.data.pagination.total);
        setPresentToday(attendanceRes.data.data.pagination.total);
        setUpcomingHolidays(holidaysRes.data.data.data);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="muted" style={{ padding: "24px 0" }}>
        Loading company overview...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
    );
  }

  if (!company) return null;

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">My Company</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>{company.legalName}</h1>
          <p>{company.tradeName || company.industry || "Company overview"}</p>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="users"
          label="Total Employees"
          value={totalEmployees}
        />
        <StatCard
          tone="green"
          icon="clock"
          label="Present Today"
          value={presentToday}
        />
        <StatCard
          tone="purple"
          icon="calendar"
          label="Upcoming Holidays"
          value={upcomingHolidays.length}
        />
        <StatCard
          tone="orange"
          icon="building"
          label="Subscription"
          value={company.subscriptionStatus || "-"}
        />
      </div>

      <section className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-head">
          <div>
            <h2>Company Details</h2>
            <p>Basic information about your organization.</p>
          </div>
        </div>
        <div className="settings-grid" style={{ padding: "0 20px 20px" }}>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 3,
              }}
            >
              Industry
            </div>
            <div style={{ fontSize: 13.5 }}>{company.industry || "-"}</div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 3,
              }}
            >
              Registration Number
            </div>
            <div style={{ fontSize: 13.5 }}>
              {company.registrationNumber || "-"}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 3,
              }}
            >
              Billing Email
            </div>
            <div style={{ fontSize: 13.5 }}>{company.billingEmail || "-"}</div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 3,
              }}
            >
              Contact Person
            </div>
            <div style={{ fontSize: 13.5 }}>
              {company.contactPerson?.name || "-"}
              {company.contactPerson?.phone
                ? ` · ${company.contactPerson.phone}`
                : ""}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 3,
              }}
            >
              Address
            </div>
            <div style={{ fontSize: 13.5 }}>
              {[
                company.address?.line1,
                company.address?.city,
                company.address?.country,
              ]
                .filter(Boolean)
                .join(", ") || "-"}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 3,
              }}
            >
              Employee Limit
            </div>
            <div style={{ fontSize: 13.5 }}>
              {company.employeeLimit || "Unlimited"}
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Upcoming Holidays</h2>
            <p>Next {upcomingHolidays.length} holiday(s) on the calendar.</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Holiday</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {upcomingHolidays.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="muted"
                    style={{ textAlign: "center", padding: 24 }}
                  >
                    No upcoming holidays scheduled.
                  </td>
                </tr>
              )}
              {upcomingHolidays.map((h) => (
                <tr key={h._id}>
                  <td>{h.name}</td>
                  <td>{formatDate(h.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
