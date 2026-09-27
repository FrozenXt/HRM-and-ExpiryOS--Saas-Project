import { Icon } from "./Icon";

export default function StatCard({ tone = "blue", icon, label, value, trend }) {
  return (
    <div className="stat-card stat-card-row">
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} size={24} />
      </div>
      <div className="stat-body">
        <div className="stat-label" title={String(label)}>
          {label}
        </div>
        <div className="stat-value" title={String(value)}>
          {value}
        </div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
    </div>
  );
}
