// Small layout helpers shared by the modal forms.
export const inputStyle = { width: "100%", padding: "9px 12px" };

export const labelStyle = {
  display: "block",
  marginBottom: 6,
  fontSize: 12.5,
  color: "var(--text-dim)",
};

export const Section = ({ title, first }) => (
  <div
    className="nav-section-title"
    style={{ padding: 0, margin: first ? "0 0 10px" : "18px 0 10px" }}
  >
    {title}
  </div>
);

export const Row = ({ children }) => (
  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>{children}</div>
);

export const Field = ({ label, children }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);
