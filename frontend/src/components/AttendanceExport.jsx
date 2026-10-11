import { useState } from "react";
import { Icon } from "./Icon";
import { downloadAttendanceReport } from "../services/attendanceService";

const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const THIS_MONTH = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

// With responseType "blob", an error body is a Blob too, so read it as JSON.
async function readError(err) {
  const data = err.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).message;
    } catch {
      /* fall through */
    }
  }
  return err.response?.data?.message || err.message || "Download failed";
}

export default function AttendanceExport({ employeeId }) {
  const [type, setType] = useState("month"); // "month" | "year"
  const [monthValue, setMonthValue] = useState(THIS_MONTH);
  const [year, setYear] = useState(now.getFullYear());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const download = async () => {
    setError("");
    try {
      setBusy(true);
      const params =
        type === "month"
          ? {
              year: Number(monthValue.slice(0, 4)),
              month: Number(monthValue.slice(5, 7)),
            }
          : { year: Number(year) };

      const res = await downloadAttendanceReport({ ...params, employeeId });

      const header = res.headers["content-disposition"] || "";
      const filename =
        header.match(/filename="?([^"]+)"?/)?.[1] ||
        (type === "month"
          ? `attendance-${monthValue}.xlsx`
          : `attendance-${year}.xlsx`);

      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(await readError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 220 }}>
          <strong>Attendance report</strong>
          <div className="muted" style={{ fontSize: 12.5 }}>
            Excel with check-in/out, hours, late, leave and holidays in colour.
          </div>
        </div>

        <select
          className="lang-btn"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Report type"
        >
          <option value="month">Monthly</option>
          <option value="year">Yearly</option>
        </select>

        {type === "month" ? (
          <input
            type="month"
            className="lang-btn"
            value={monthValue}
            max={THIS_MONTH}
            onChange={(e) => e.target.value && setMonthValue(e.target.value)}
            aria-label="Month"
          />
        ) : (
          <input
            type="number"
            className="lang-btn"
            style={{ width: 90 }}
            value={year}
            min={2000}
            max={now.getFullYear()}
            onChange={(e) => setYear(e.target.value)}
            aria-label="Year"
          />
        )}

        <button className="btn primary" disabled={busy} onClick={download}>
          <Icon name="fileText" size={16} />
          {busy ? "Preparing..." : "Download Excel"}
        </button>
      </div>
      {error && (
        <div style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>
          {error}
        </div>
      )}
    </section>
  );
}
