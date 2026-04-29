// filepath: src/components/KPICard.jsx
export default function KPICard({ title, value, subtitle, color = 'blue' }) {
  const colorClasses = {
    blue: 'border-l-[#1c78bb]',
    green: 'border-l-[#0d7a75]',
    purple: 'border-l-[#6d62b5]',
    orange: 'border-l-[#c47d2f]',
    indigo: 'border-l-[#455c94]',
  };

  const accentClass = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`surface-panel rounded-lg border-l-4 p-6 ${accentClass}`}>
      <h3 className="text-sm font-bold uppercase tracking-wide panel-muted">
        {title}
      </h3>
      <p className="mt-2 text-4xl font-bold panel-title">{value?.toLocaleString()}</p>
      {subtitle && (
        <p className="mt-1 text-sm panel-muted">{subtitle}</p>
      )}
    </div>
  );
}
