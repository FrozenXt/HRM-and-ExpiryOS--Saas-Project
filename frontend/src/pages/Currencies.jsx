import { useEffect, useState } from "react";
import { getCurrencies, deleteCurrency } from "../services/currencyService";
import { Icon } from "../components/Icon";
import CurrencyFormModal from "../components/CurrencyFormModal";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

function StatCard({ tone, icon, label, value, trend }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={24} />
      </div>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
    </div>
  );
}

export default function Currencies() {
  const [currencies, setCurrencies] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null); // "create" | "edit" | null
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const fetchCurrencies = async (page = 1) => {
    try {
      setLoading(true);
      setError("");

      const fields = [];
      if (statusFilter === "active") {
        fields.push({ field: "isActive", operator: "eq", value: true });
      } else if (statusFilter === "inactive") {
        fields.push({ field: "isActive", operator: "eq", value: false });
      }

      const result = await getCurrencies({
        page,
        limit: 20,
        sort: "ASC",
        sort_field: "code",
        fields,
      });

      setCurrencies(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = currencies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.symbol?.toLowerCase().includes(q)
    );
  });

  const activeCount = currencies.filter((c) => c.isActive).length;
  const inactiveCount = currencies.length - activeCount;

  const openCreate = () => {
    setSelectedCurrency(null);
    setModalMode("create");
  };
  const openEdit = (currency) => {
    setSelectedCurrency(currency);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedCurrency(null);
  };

  const handleDelete = async (currency) => {
    if (
      !window.confirm(
        `Delete ${currency.name} (${currency.code})? This can't be undone.`,
      )
    ) {
      return;
    }
    try {
      setDeletingId(currency._id);
      await deleteCurrency(currency._id);
      fetchCurrencies(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const from = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <div className="breadcrumb">
        <span>Dashboard</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Currencies</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Currencies</h1>
          <p>
            Manage the currencies available for company billing and payroll.
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          New Currency
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="dollar"
          label="Total Currencies"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="clock"
          label="Active Currencies"
          value={activeCount}
        />
        <StatCard
          tone="orange"
          icon="building"
          label="Inactive Currencies"
          value={inactiveCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Currencies</h2>
            <p>A list of all currencies configured in the system.</p>
          </div>

          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search currencies..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="lang-btn"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">Filter: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading currencies...
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
                    <th>Code</th>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th>Decimal Places</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No currencies found. Try a different search or filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map((c, i) => (
                    <tr key={c._id}>
                      <td>{from + i}</td>
                      <td>
                        <strong>{c.code}</strong>
                      </td>
                      <td>{c.name}</td>
                      <td>{c.symbol}</td>
                      <td>{c.decimalPlaces}</td>
                      <td>
                        <span
                          className={`badge ${c.isActive ? "success" : "warning"}`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatDate(c.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(c)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={deletingId === c._id}
                            onClick={() => handleDelete(c)}
                          >
                            <Icon name="trash" size={14} />{" "}
                            {deletingId === c._id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} currencies
              </span>

              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCurrencies(pagination.page - 1)}
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
                    onClick={() => fetchCurrencies(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchCurrencies(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalMode && (
        <CurrencyFormModal
          mode={modalMode}
          currency={selectedCurrency}
          onClose={closeModal}
          onSaved={() => fetchCurrencies(pagination.page)}
        />
      )}
    </>
  );
}
