import { useEffect, useState } from "react";
import { getPlans } from "../services/planService";
import { Icon } from "../components/Icon";
import PlanFormModal from "../components/PlanFormModal";

const FEATURE_LABELS = {
  payroll: "Payroll",
  attendance: "Attendance",
  expense_claims: "Expense Claims",
};

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showModal, setShowModal] = useState(false);

  const fetchPlans = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter === "active") {
        fields.push({ field: "isActive", operator: "eq", value: true });
      } else if (statusFilter === "inactive") {
        fields.push({ field: "isActive", operator: "eq", value: false });
      }

      const result = await getPlans({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "monthlyPrice",
        fields,
      });

      setPlans(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handlePlanCreated = () => {
    fetchPlans(pagination.page);
  };

  return (
    <>
      {/* Header row */}
      <div className="welcome-row">
        <div className="welcome-text">
          <h1>
            <Icon name="list" size={22} className="crown-icon" /> Subscription
            Plans
          </h1>
          <p>Manage the pricing plans available to companies.</p>
        </div>
        <button
          className="quick-btn blue"
          style={{ width: "auto", flexDirection: "row", gap: 8 }}
          onClick={() => setShowModal(true)}
        >
          <Icon name="plusCircle" size={17} />
          <span>Add Plan</span>
        </button>
      </div>

      <section className="panel">
        <div className="panel-head" style={{ flexWrap: "wrap", gap: 12 }}>
          <h2>
            <Icon name="list" size={16} /> All Plans
          </h2>

          <select
            className="lang-btn"
            style={{ cursor: "pointer" }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading plans...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : plans.length === 0 ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            No plans found.
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Plan Name</th>
                    <th>Employee Limit</th>
                    <th>Monthly Price</th>
                    <th>Features</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p, i) => (
                    <tr key={p._id}>
                      <td>{p.id_int ?? i + 1}</td>
                      <td className="company-name">{p.name}</td>
                      <td>{p.employeeLimit} employees</td>
                      <td>${p.monthlyPrice.toLocaleString()}/mo</td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {p.features.map((f) => (
                            <span
                              key={f}
                              className="badge success"
                              style={{ fontWeight: 600 }}
                            >
                              {FEATURE_LABELS[f] || f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${p.isActive ? "success" : "warning"}`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="more-btn" title="Edit">
                            <Icon name="edit" size={15} />
                          </button>
                          <button className="more-btn" title="Delete">
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPlans(pagination.page - 1)}
              >
                <Icon name="chevronLeft" size={14} />
              </button>

              <span className="dots">
                Showing {plans.length} of {pagination.total} plans — Page{" "}
                {pagination.page} of {pagination.total_pages}
              </span>

              <button
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => fetchPlans(pagination.page + 1)}
              >
                <Icon name="chevronRight" size={14} />
              </button>
            </div>
          </>
        )}
      </section>

      {showModal && (
        <PlanFormModal
          onClose={() => setShowModal(false)}
          onCreated={handlePlanCreated}
        />
      )}
    </>
  );
}
