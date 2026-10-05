// src/pages/GeofenceZones.jsx
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { isSuperAdmin, getCurrentUser } from "../utils/auth";
import StatCard from "../components/StatCard";
import GeofenceZoneFormModal from "../components/GeofenceZoneFormModal";
import {
  getGeofenceZones,
  updateGeofenceZone,
  deleteGeofenceZone,
} from "../services/geofenceService";

export default function GeofenceZones() {
  const superAdmin = isSuperAdmin();
  // Everyone can read zones (field staff need them for check-in validation);
  // only admin/hr/super_admin can change them.
  const role = getCurrentUser()?.role;
  const canManage = ["super_admin", "admin", "hr"].includes(role);

  const [zones, setZones] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalMode, setModalMode] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const fetchZones = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      const fields = [];
      if (statusFilter === "active")
        fields.push({ field: "isActive", operator: "eq", value: true });
      if (statusFilter === "inactive")
        fields.push({ field: "isActive", operator: "eq", value: false });
      const result = await getGeofenceZones({ page, limit: 20, fields });
      setZones(result.data.data.data);
      setPagination(result.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return zones.filter(
      (z) =>
        z.name?.toLowerCase().includes(q) ||
        z.companyId?.legalName?.toLowerCase().includes(q),
    );
  }, [zones, search]);

  const activeCount = zones.filter((z) => z.isActive).length;

  const openCreate = () => {
    setSelected(null);
    setModalMode("create");
  };
  const openEdit = (z) => {
    setSelected(z);
    setModalMode("edit");
  };
  const closeModal = () => {
    setModalMode(null);
    setSelected(null);
  };

  const handleToggle = async (z) => {
    try {
      setBusyId(z._id);
      setActionError("");
      await updateGeofenceZone(z._id, { isActive: !z.isActive });
      fetchZones(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (z) => {
    if (!window.confirm(`Delete the zone "${z.name}"? This cannot be undone.`))
      return;
    try {
      setActionError("");
      await deleteGeofenceZone(z._id);
      fetchZones(pagination.page);
    } catch (err) {
      setActionError(err.response?.data?.message || err.message);
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
        <span>Attendance</span>
        <Icon name="chevronRight" size={12} />
        <span className="current">Geofence Zones</span>
      </div>

      <div className="welcome-row">
        <div className="welcome-text">
          <h1>Geofence Zones</h1>
          <p>
            {canManage
              ? "Define the locations where employees are allowed to check in."
              : "Locations where you can check in."}
          </p>
        </div>
        {canManage && (
          <button className="btn primary" onClick={openCreate}>
            <Icon name="plusCircle" size={17} />
            Add Zone
          </button>
        )}
      </div>

      <div className="stat-grid">
        <StatCard
          tone="blue"
          icon="globe"
          label="Total Zones"
          value={pagination.total}
        />
        <StatCard
          tone="green"
          icon="check"
          label="Active (this page)"
          value={activeCount}
        />
        <StatCard
          tone="orange"
          icon="clock"
          label="Inactive (this page)"
          value={zones.length - activeCount}
        />
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Zones</h2>
            <p>A list of geofence zones for your company.</p>
          </div>
          <div className="panel-tools">
            <div className="search-box">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search by zone or company..."
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

        {actionError && (
          <div
            style={{ color: "var(--red)", fontSize: 13, padding: "10px 20px" }}
          >
            {actionError}
          </div>
        )}

        {loading ? (
          <div className="muted" style={{ padding: "24px 0" }}>
            Loading zones...
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
                    <th>Zone</th>
                    {superAdmin && <th>Company</th>}
                    <th>Coordinates</th>
                    <th>Radius</th>
                    <th>Status</th>
                    {canManage && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={
                          4 + (superAdmin ? 1 : 0) + 1 + (canManage ? 1 : 0)
                        }
                        className="muted"
                        style={{ textAlign: "center", padding: 28 }}
                      >
                        No geofence zones found.
                        {canManage &&
                          " Add one to enable location-based check-in."}
                      </td>
                    </tr>
                  )}
                  {filtered.map((z, i) => (
                    <tr key={z._id}>
                      <td>{z.id_int ?? from + i}</td>
                      <td style={{ fontWeight: 500 }}>{z.name}</td>
                      {superAdmin && <td>{z.companyId?.legalName || "-"}</td>}
                      <td>
                        <a
                          href={`https://www.google.com/maps?q=${z.latitude},${z.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--blue)" }}
                        >
                          {Number(z.latitude).toFixed(5)},{" "}
                          {Number(z.longitude).toFixed(5)}
                        </a>
                      </td>
                      <td>{z.radiusMeters} m</td>
                      <td>
                        <span
                          className={`badge ${z.isActive ? "success" : "warning"}`}
                        >
                          {z.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              className="btn btn-sm"
                              onClick={() => openEdit(z)}
                            >
                              <Icon name="edit" size={13} /> Edit
                            </button>
                            <button
                              className="btn btn-sm"
                              disabled={busyId === z._id}
                              onClick={() => handleToggle(z)}
                            >
                              {z.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(z)}
                            >
                              <Icon name="trash" size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <span>
                Showing {from}–{to} of {pagination.total} zones
              </span>
              <div className="pager">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchZones(pagination.page - 1)}
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
                    onClick={() => fetchZones(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={pagination.page >= pagination.total_pages}
                  onClick={() => fetchZones(pagination.page + 1)}
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
        <GeofenceZoneFormModal
          mode={modalMode}
          zone={selected}
          onClose={closeModal}
          onSaved={() => fetchZones(pagination.page)}
        />
      )}
    </>
  );
}
