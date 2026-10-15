// filepath: src/components/KPICard.jsx
export default function KPICard({
  title,
  value,
  subtitle,
  color = "#147e83",
  share,
  featured = false,
}) {
  return (
    <article
      className={`kpi-card ${featured ? "kpi-featured" : ""}`}
      style={{ "--quarter-color": color }}
    >
      <h3>
        {featured ? (
          <span className="metric-dot" />
        ) : (
          <span className="quarter-dot" />
        )}
        {title}
      </h3>
      <p className="kpi-value">{(value || 0).toLocaleString()}</p>
      <div className="kpi-foot">
        <span>{subtitle}</span>
        {!featured && <strong>{share}%</strong>}
      </div>
      {!featured && (
        <div className="kpi-track">
          <span style={{ width: `${share}%` }} />
        </div>
      )}
    </article>
  );
}
