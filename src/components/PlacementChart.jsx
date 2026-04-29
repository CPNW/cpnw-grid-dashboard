// filepath: src/components/PlacementChart.jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#1c78bb', '#0d7a75', '#6d62b5', '#c47d2f', '#bf4d5a', '#4f7d95', '#8b5c7e', '#455c94'];

export default function PlacementChart({ data, title, dataKey = 'value', nameKey = 'name', horizontal = false }) {
  const chartData = Object.entries(data || {})
    .map(([key, val]) => ({
      [nameKey]: String(key).trim(),
      [dataKey]: val,
    }))
    .filter(item => item[nameKey] && item[dataKey] > 0)
    .sort((a, b) => b[dataKey] - a[dataKey]);

  if (chartData.length === 0) {
    return (
      <div className="surface-panel rounded-lg p-6">
        <h3 className="mb-4 text-lg font-semibold panel-title">{title}</h3>
        <p className="py-8 text-center panel-muted">No data available</p>
      </div>
    );
  }

  const shouldUseHorizontal = horizontal || chartData.some(item => item[nameKey].length > 14);
  const chartHeight = shouldUseHorizontal ? Math.max(260, chartData.length * 42) : 260;

  return (
    <div className="surface-panel rounded-lg p-6">
      <h3 className="mb-4 text-lg font-semibold panel-title">{title}</h3>
      <div className="min-w-0" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          {shouldUseHorizontal ? (
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 24, left: 84, bottom: 5 }}>
              <CartesianGrid stroke="#d9e1ea" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#53606d', fontSize: 12 }} />
              <YAxis type="category" dataKey={nameKey} width={130} tick={{ fill: '#53606d', fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #d9e1ea', color: '#18222f' }}
                formatter={(value) => [value.toLocaleString(), 'Count']}
              />
              <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid stroke="#d9e1ea" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey={nameKey} 
                tick={{ fill: '#53606d', fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: '#53606d', fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #d9e1ea', color: '#18222f' }}
                formatter={(value) => [value.toLocaleString(), 'Count']}
              />
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
