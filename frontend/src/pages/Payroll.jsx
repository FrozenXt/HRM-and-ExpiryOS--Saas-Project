import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Icon } from "../components/Icon";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";
import StatCard from "../components/StatCard";
import PayrollFormModal from "../components/PayrollFormModal";
import StatutoryDeductionModal from "../components/StatutoryDeductionModal";
import { listOptions } from "../services/employeeService";

import {
  getPayrolls,
  deletePayroll,
  approvePayroll,
  releasePayroll,
  bulkReleasePayrolls,
} from "../services/payrollService";

const API_BASE = "http://localhost:5000/api/v1";

const idOf = (v) => v?._id || v || "";
const fullName = (u) => (u ? `${u.firstName} ${u.lastName || ""}`.trim() : "");
const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));
const money = (amount, symbol) =>
  `${symbol || ""}${Number(amount || 0).toLocaleString()}`;

const statusBadge = {
  draft: "warning",
  approved: "plan-default",
  released: "success",
};

export default function Payrolls() {
  const superAdmin = isSuperAdmin();
  // Staff get a read-only + download-only view — every management action
  // below (generate, edit, approve, delete, release, deductions) is
  // server-side restricted to admin/hr/super_admin anyway; this just keeps
  // the UI from showing buttons that would always 403 for a staff member.
  const role = getCurrentUser()?.role;
  const canManage = ["super_admin", "admin", "hr"].includes(role);

  const [payrolls, setPayrolls] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [lookups, setLookups] = useState({
    users: {},
    employees: {},
    companies: {},
    currencies: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [deductionPayroll, setDeductionPayroll] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkReleasing, setBulkReleasing] = useState(false);

  const loadLookups = async () => {
    try {
      const [users, employees, companies, currencies] = (
        await Promise.allSettled([
          listOptions("users"),
          listOptions("employees"),
          superAdmin ? listOptions("companies") : Promise.resolve([]),
          listOptions("currencies"),
        ])
      ).map((r) => (r.status === "fulfilled" ? r.value : []));
      setLookups({
        users: byId(users),
        employees: byId(employees),
        companies: byId(companies),
        currencies: byId(currencies),
      });
    } catch {
      /* names just fall back to "-" */
    }
  };

  const fetchPayrolls = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }
      const result = await getPayrolls({ page, limit: 20, fields });
      setPayrolls(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    fetchPayrolls(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const view = (p) => {
    const employee =
      typeof p.employeeId === "object"
        ? p.employeeId
        : lookups.employees[p.employeeId];
    const user =
      typeof employee?.userId === "object"
        ? employee.userId
        : lookups.users[employee?.userId];
    const company =
      typeof p.companyId === "object"
        ? p.companyId
        : lookups.companies[p.companyId];
    const currency =
      typeof p.currencyId === "object"
        ? p.currencyId
        : lookups.currencies[p.currencyId];
    return {
      employeeName: fullName(user) || "-",
      company: company?.legalName || "-",
      currencySymbol: currency?.symbol || "",
    };
  };

  const rows = useMemo(
    () => payrolls.map((p) => ({ p, v: view(p) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [payrolls, lookups],
  );

  const filtered = rows.filter(({ v, p }) => {
    const q = search.toLowerCase();
    return (
      v.employeeName.toLowerCase().includes(q) ||
      v.company.toLowerCase().includes(q) ||
      p.period?.toLowerCase().includes(q)
    );
  });

  // Only records on the current page that are approved-and-selectable for
  // bulk release. Selection is scoped to this page — see note below.
  const approvedRows = filtered.filter(({ p }) => p.status === "approved");

  const draftCount = payrolls.filter((p) => p.status === "draft").length;
  const releasedCount = payrolls.filter((p) => p.status === "released").length;

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (p) => {
    setSelected(p);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleDelete = async (p, name) => {
    if (!window.confirm(`Delete the draft payroll for ${name} (${p.period})?`))
      return;
    try {
      await deletePayroll(p._id);
      fetchPayrolls(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const handleApprove = async (p) => {
    try {
      setBusyId(p._id);
      await approvePayroll(p._id);
      fetchPayrolls(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleRelease = async (p) => {
    if (
      !window.confirm(
        `Release this payroll? The employee will see it as final.`,
      )
    )
      return;
    try {
      setBusyId(p._id);
      await releasePayroll(p._id);
      fetchPayrolls(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const toggleSelect = (id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleSelectAllApproved = () => {
    const approvedIds = approvedRows.map(({ p }) => p._id);
    const allSelected =
      approvedIds.length > 0 &&
      approvedIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : approvedIds);
  };

  const handleBulkRelease = async () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Release ${selectedIds.length} payroll record(s)? Employees will see them as final.`,
      )
    )
      return;
    try {
      setBulkReleasing(true);
      setError("");
      const res = await bulkReleasePayrolls(selectedIds);
      const {
        releasedCount: releasedNow,
        failedCount,
        results,
      } = res.data.data;
      if (failedCount > 0) {
        const failedNotes = results
          .filter((r) => !r.success)
          .map((r) => r.error)
          .join("; ");
        setError(
          `${releasedNow} released, ${failedCount} failed: ${failedNotes}`,
        );
      }
      setSelectedIds([]);
      fetchPayrolls(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setBulkReleasing(false);
    }
  };

  const handleDownloadPayslip = async (p) => {
    try {
      setBusyId(p._id);
      setError("");
      const res = await axios.get(`${API_BASE}/payroll/${p._id}/payslip`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${p.period}.pdf`; // server sets the real filename via Content-Disposition; this is just a fallback
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // err.response.data is a Blob here (since responseType: "blob"), so
      // the JSON error message inside it isn't directly readable — fall
      // back to a generic message rather than showing "[object Blob]".
      setError("Failed to download payslip. Please try again.");
    } finally {
      setBusyId(null);
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
        <span>HR Management</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Payroll</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Payroll</h1>
          <p>
            {canManage
              ? "Generate, approve and release payroll for each pay period."
              : "View and download your payroll records."}
            {!superAdmin && " You'll see records for your company only."}
          </p>
        </div>
        {canManage && (
          <button className="btn primary" onClick={openCreate}>
            <Icon name="plusCircle" size={17} />
            Generate Payroll
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="dollar"
          label="Total Records"
          value={pagination.total}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Drafts (this page)"
          value={draftCount}
        />
        <StatCard
          tone="green"
          icon="users"
          label="Released (this page)"
          value={releasedCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Payroll Records</h2>
            <p>A list of all payroll records visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by employee, company or period..."
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
              <option value="all">Filter: All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="released">Released</option>
            </select>
          </div>
        </div>

        {canManage && approvedRows.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <input
                type="checkbox"
                checked={
                  approvedRows.length > 0 &&
                  approvedRows.every(({ p }) => selectedIds.includes(p._id))
                }
                onChange={toggleSelectAllApproved}
              />
              Select all approved ({approvedRows.length})
            </label>
            <button
              className="btn btn-sm primary"
              disabled={selectedIds.length === 0 || bulkReleasing}
              onClick={handleBulkRelease}
            >
              <Icon name="chevronRight" size={13} />{" "}
              {bulkReleasing
                ? "Releasing..."
                : `Release Selected (${selectedIds.length})`}
            </button>
          </div>
        )}

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading payroll records...
          </div>
        ) : error ? (
          <div style={{ color: "var(--red)", padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {canManage && <th style={{ width: 32 }}></th>}
                    <th>#</th>
                    <th>Employee</th>
                    {superAdmin && <th>Company</th>}
                    <th>Period</th>
                    <th>Payable Days</th>
                    <th>Net Pay</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          superAdmin ? (canManage ? 9 : 8) : canManage ? 8 : 7
                        }
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No payroll records found.
                        {canManage && " Generate one or change the filter."}
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ p, v }, i) => (
                    <tr key={p._id}>
                      {canManage && (
                        <td>
                          {p.status === "approved" && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(p._id)}
                              onChange={() => toggleSelect(p._id)}
                            />
                          )}
                        </td>
                      )}
                      <td>{p.id_int ?? from + i}</td>
                      <td>
                        <div className="company-cell">
                          <span
                            className="co-avatar"
                            style={{
                              background: "#3b82f6",
                              borderRadius: "50%",
                            }}
                          >
                            {initials(v.employeeName)}
                          </span>
                          <span>{v.employeeName}</span>
                        </div>
                      </td>
                      {superAdmin && <td>{v.company}</td>}
                      <td>{p.period}</td>
                      <td>{p.payableDays}</td>
                      <td>{money(p.netPay, v.currencySymbol)}</td>
                      <td>
                        <span
                          className={`badge ${statusBadge[p.status] || "warning"}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          {canManage && p.status !== "released" && (
                            <button
                              className="btn btn-sm"
                              onClick={() => setDeductionPayroll(p)}
                            >
                              <Icon name="dollar" size={13} /> Deductions
                            </button>
                          )}
                          {canManage && p.status === "draft" && (
                            <>
                              <button
                                className="btn btn-sm"
                                onClick={() => openEdit(p)}
                              >
                                <Icon name="edit" size={13} /> Edit
                              </button>
                              <button
                                className="btn btn-sm"
                                disabled={busyId === p._id}
                                onClick={() => handleApprove(p)}
                              >
                                <Icon name="chevronRight" size={13} /> Approve
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDelete(p, v.employeeName)}
                              >
                                <Icon name="trash" size={14} /> Delete
                              </button>
                            </>
                          )}
                          {canManage && p.status === "approved" && (
                            <button
                              className="btn btn-sm primary"
                              disabled={busyId === p._id}
                              onClick={() => handleRelease(p)}
                            >
                              <Icon name="chevronRight" size={13} /> Release
                            </button>
                          )}
                          {p.status === "released" && (
                            <button
                              className="btn btn-sm primary"
                              disabled={busyId === p._id}
                              onClick={() => handleDownloadPayslip(p)}
                            >
                              <Icon name="fileText" size={13} />{" "}
                              {busyId === p._id
                                ? "Preparing..."
                                : "Download Payslip"}
                            </button>
                          )}
                          {!canManage && p.status !== "released" && (
                            <span className="muted" style={{ fontSize: 12.5 }}>
                              {p.status === "draft"
                                ? "Awaiting processing"
                                : "Awaiting release"}
                            </span>
                          )}
                        </div>
                      </td>
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
                  onClick={() => fetchPayrolls(pagination.page - 1)}
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
                    onClick={() => fetchPayrolls(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchPayrolls(pagination.page + 1)}
                  aria-label="Next page"
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modalMode && canManage && (
        <PayrollFormModal
          mode={modalMode}
          payroll={selected}
          onClose={closeModal}
          onSaved={() => fetchPayrolls(pagination.page)}
        />
      )}

      {deductionPayroll && canManage && (
        <StatutoryDeductionModal
          payroll={deductionPayroll}
          onClose={() => setDeductionPayroll(null)}
          onSaved={() => fetchPayrolls(pagination.page)}
        />
      )}
    </>
  );
}
