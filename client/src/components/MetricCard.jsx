function MetricCard({ label, value, delta, icon }) {
  return (
    <article className="metric-card">
      <div className="metric-card__header">
        <span>{label}</span>
        <div className="metric-icon" aria-hidden="true">
          {icon}
        </div>
      </div>
      <strong>{value}</strong>
      <div className="metric-card__footer">
        <span className="metric-dot" aria-hidden="true" />
        <p>{delta}</p>
      </div>
    </article>
  );
}

export default MetricCard;
