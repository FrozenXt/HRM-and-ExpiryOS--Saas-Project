import { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icon";
import StatCard from "./StatCard";
import useEmployeeLookups from "../hooks/useEmployeeLookups";
import { getCurrentUser } from "../utils/auth";
import { getConsents } from "../services/monitoringService";

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

export default function MonitoringConsentsTab() {
  const role = getCurrentUser()?.role;
  const isStaff = role === "staff";
  const superAdmin = role === "super_admin";
  const { employeeName, companyName } = useEmployeeLookups();

  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | given | revoked

  const fetchRows = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (filter === "given")
        fields.push({ field: "consentGiven", operator: "eq", value: true });
      if (filter === "revoked")
        fields.push({ field: "consentGiven", operator: "eq", value: false });
      const result = await getConsents({ page, limit: 20, fields });
      setRows(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) => !q || employeeName(r.employeeId).toLowerCase().includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, employeeName]);

  const givenCount = rows.filter((r) => r.consentGiven).length;
  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="shield"
          label="Total Records"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Given (this page)"
          value={givenCount}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Revoked (this page)"
          value={rows.length - givenCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{isStaff ? "My Consent History" : "Consent Records"}</h2>
            <p>
              Every grant and revocation is kept as its own entry — the most
              recent entry for an employee is their current status.
            </p>
          </div>
          <div className="panel-tools">
            {!isStaff && (
              <div className="search-box">
                <Icon name="search" size={16} />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
            <select
              className="lang-btn"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Filter by consent"
            >
              <option value="all">All records</option>
              <option value="given">Given</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading consent records...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    {!isStaff && <th>Employee</th>}
                    {superAdmin && <th>Company</th>}
                    <th>Consent</th>
                    <th>Date</th>
                    <th>Policy Version</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={5 + (isStaff ? 0 : 1) + (superAdmin ? 1 : 0)}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No consent records found.
                      </td>
                    </tr>
                  )}
                  {filtered.map((r, i) => (
                    <tr key={r._id}>
                      <td>{r.id_int ?? from + i}</td>
                      {!isStaff && (
                        <td style={{ fontWeight: 500 }}>
                          {employeeName(r.employeeId)}
                        </td>
                      )}
                      {superAdmin && <td>{companyName(r.companyId)}</td>}
                      <td>
                        <span
                          className={`badge ${r.consentGiven ? "success" : "warning"}`}
                        >
                          {r.consentGiven ? "Given" : "Revoked"}
                        </span>
                      </td>
                      <td>{formatDateTime(r.consentDate)}</td>
                      <td>{r.policyVersion || "-"}</td>
                      <td>{r.ipAddress || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} records
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchRows(pagination.page - 1)}
                  aria-label="Previous page"
                >
                  <Icon name="chevronLeft" size={14} />
                </button>
                {Array.from(
                  { length: pagination.total_pages || 1 },
                  (_, n) => n + 1,
                ).map((p) => (
                  <button
                    key={p}
                    className={p === pagination.page ? "active" : ""}
                    onClick={() => fetchRows(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchRows(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
