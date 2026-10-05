import { useEffect, useState } from "react";
import { getSubscriptions } from "../services/subscriptionService";
import { Icon } from "../components/Icon";

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchSubscriptions = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }

      const result = await getSubscriptions({
        page,
        limit: 20,
        sort: "DESC",
        sort_field: "createdAt",
        fields,
      });

      setSubscriptions(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const companyLabel = (c) =>
    c?.tradeName || c?.legalName || (typeof c === "string" ? c : "-");

  const formatDate = (d) => (d ? new Date(d).toLocaleDateString() : "-");

  return (
    <>
      <div className="welcome-row">
        <div className="welcome-text">
          <h1>
            <Icon name="list" size={22} className="crown-icon" /> Company
            Subscriptions
          </h1>
          <p>Plan, usage, and billing status for every company.</p>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <h2>
            <Icon name="list" size={16} /> All Subscriptions
          </h2>

          <select
            className="lang-btn"
            style={{ cursor: "pointer" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading subscriptions...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : subscriptions.length === 0 ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            No subscriptions found.
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Company</th>
                    <th>Plan</th>
                    <th>Billing Cycle</th>
                    <th>Employees</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Renews</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((s, i) => (
                    <tr key={s._id}>
                      <td>{s.id_int ?? i + 1}</td>
                      <td className="company-name">
                        {companyLabel(s.companyId)}
                      </td>
                      <td>{s.planId?.name || "-"}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        {s.billingCycle}
                      </td>
                      <td>{s.employeeCount}</td>
                      <td>
                        {s.planId?.isCustomPricing
                          ? `Custom — ${s.currency} ${s.totalAmount.toLocaleString()}`
                          : `${s.currency} ${s.totalAmount.toLocaleString()}`}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.status === "active"
                              ? "success"
                              : s.status === "past_due"
                                ? "warning"
                                : "warning"
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="muted">{formatDate(s.nextBillingDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSubscriptions(pagination.page - 1)}
              >
                <Icon name="chevronLeft" size={14} />
              </button>

              <span className="dots">
                Showing {subscriptions.length} of {pagination.total} — Page{" "}
                {pagination.page} of {pagination.total_pages}
              </span>

              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchSubscriptions(pagination.page + 1)}
              >
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}
