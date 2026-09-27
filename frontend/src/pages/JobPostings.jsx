import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin } from "../utils/auth";
import StatCard from "../components/StatCard";
import JobPostingFormModal from "../components/JobPostingFormModal";
import { listOptions } from "../services/employeeService";
import {
  getJobPostings,
  deleteJobPosting,
} from "../services/jobPostingService";

const idOf = (v) => v?._id || v || "";
const byId = (rows) => Object.fromEntries(rows.map((r) => [r._id, r]));

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "-";

const statusBadge = {
  open: "success",
  on_hold: "warning",
  closed: "plan-default",
  filled: "plan-business",
};

const readableLabel = (v = "") =>
  v
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");

export default function JobPostings() {
  const superAdmin = isSuperAdmin();
  const [postings, setPostings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [lookups, setLookups] = useState({
    companies: {},
    departments: {},
    designations: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);

  const loadLookups = async () => {
    try {
      const [companies, departments, designations] = (
        await Promise.allSettled([
          superAdmin ? listOptions("companies") : Promise.resolve([]),
          listOptions("departments"),
          listOptions("designations"),
        ])
      ).map((r) => (r.status === "fulfilled" ? r.value : []));
      setLookups({
        companies: byId(companies),
        departments: byId(departments),
        designations: byId(designations),
      });
    } catch {
      /* names just fall back to "-" */
    }
  };

  const fetchPostings = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter !== "all") {
        fields.push({ field: "status", operator: "eq", value: statusFilter });
      }
      const result = await getJobPostings({ page, limit: 20, fields });
      setPostings(result.data.data.data);
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
    fetchPostings(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const view = (p) => {
    const company =
      typeof p.companyId === "object"
        ? p.companyId
        : lookups.companies[p.companyId];
    const department =
      typeof p.departmentId === "object"
        ? p.departmentId
        : lookups.departments[p.departmentId];
    const designation =
      typeof p.designationId === "object"
        ? p.designationId
        : lookups.designations[p.designationId];
    return {
      company: company?.legalName || "-",
      department: department?.name || "-",
      designation: designation?.name || "-",
    };
  };

  const rows = useMemo(
    () => postings.map((p) => ({ p, v: view(p) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [postings, lookups],
  );

  const filtered = rows.filter(({ v, p }) => {
    const q = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(q) ||
      v.company.toLowerCase().includes(q) ||
      v.department.toLowerCase().includes(q)
    );
  });

  const openCount = postings.filter((p) => p.status === "open").length;
  const totalOpenings = postings.reduce(
    (sum, p) => sum + (Number(p.numberOfOpenings) || 0),
    0,
  );

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

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete the job posting "${p.title}"?`)) return;
    try {
      await deleteJobPosting(p._id);
      fetchPostings(pagination.page);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
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
        <span>Hiring</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Job Postings</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Job Postings</h1>
          <p>
            Manage open roles and hiring requisitions.
            {!superAdmin && " You'll see postings for your company only."}
          </p>
        </div>
        <button className="btn primary" onClick={openCreate}>
          <Icon name="plusCircle" size={17} />
          New Job Posting
        </button>
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="briefcase"
          label="Total Postings"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Open (this page)"
          value={openCount}
        />
        <StatCard
          tone="purple"
          icon="users"
          label="Total Openings (this page)"
          value={totalOpenings}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Job Postings</h2>
            <p>A list of all job postings visible to your role.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by title, company or department..."
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
              <option value="open">Open</option>
              <option value="on_hold">On Hold</option>
              <option value="closed">Closed</option>
              <option value="filled">Filled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading job postings...
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
                    <th>Title</th>
                    {superAdmin && <th>Company</th>}
                    <th>Department</th>
                    <th>Designation</th>
                    <th>Type</th>
                    <th>Openings</th>
                    <th>Status</th>
                    <th>Closing Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={superAdmin ? 10 : 9}
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No job postings found. Create one or change the filter.
                      </td>
                    </tr>
                  )}
                  {filtered.map(({ p, v }, i) => (
                    <tr key={p._id}>
                      <td>{p.id_int ?? from + i}</td>
                      <td>{p.title}</td>
                      {superAdmin && <td>{v.company}</td>}
                      <td>{v.department}</td>
                      <td>{v.designation}</td>
                      <td>{readableLabel(p.employmentType)}</td>
                      <td>{p.numberOfOpenings}</td>
                      <td>
                        <span
                          className={`badge ${statusBadge[p.status] || "warning"}`}
                        >
                          {readableLabel(p.status)}
                        </span>
                      </td>
                      <td>{formatDate(p.closingDate)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn btn-sm"
                            onClick={() => openEdit(p)}
                          >
                            <Icon name="edit" size={13} /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(p)}
                          >
                            <Icon name="trash" size={14} /> Delete
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
                Showing {from}–{to} of {pagination.total} postings
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchPostings(pagination.page - 1)}
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
                    onClick={() => fetchPostings(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchPostings(pagination.page + 1)}
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
        <JobPostingFormModal
          mode={modalMode}
          posting={selected}
          onClose={closeModal}
          onSaved={() => fetchPostings(pagination.page)}
        />
      )}
    </>
  );
}
