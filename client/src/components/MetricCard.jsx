import { CalendarDays, Clock3, Stethoscope, UserRound, Users, ArrowUpRight } from "lucide-react";

const metricIcons = {
  AP: CalendarDays,
  DR: Stethoscope,
  OV: UserRound,
  PN: Clock3,
  TP: Users,
};

function MetricCard({ label, value, delta, icon }) {
  const Icon = typeof icon === "string" ? metricIcons[icon] : null;

  return (
    <article className="metric-card">
      <div className="metric-card__header">
        <span>{label}</span>
        <div className="metric-icon" aria-hidden="true">
          {Icon ? <Icon size={16} strokeWidth={2.1} /> : icon}
        </div>
      </div>
      <strong>{value}</strong>
      <div className="metric-card__footer">
        <span className="metric-trend" aria-hidden="true">
          <ArrowUpRight size={14} strokeWidth={2.5} />
        </span>
        <p>{delta}</p>
      </div>
    </article>
  );
}

export default MetricCard;
