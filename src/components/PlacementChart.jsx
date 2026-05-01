// filepath: src/components/PlacementChart.jsx
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LabelList } from 'recharts';

const COLORS = ['#1c78bb', '#0d7a75', '#6d62b5', '#c47d2f', '#bf4d5a', '#4f7d95', '#8b5c7e', '#455c94'];

export default function PlacementChart({ data, title, dataKey = 'value', nameKey = 'name', horizontal = false, chartType = 'bar', autoHorizontal = true, showValues = false }) {
  const [isFocused, setIsFocused] = useState(false);
  const chartData = Object.entries(data || {})
    .map(([key, val]) => ({
      [nameKey]: String(key).trim(),
      [dataKey]: val,
    }))
    .filter(item => item[nameKey] && item[dataKey] > 0)
    .sort((a, b) => b[dataKey] - a[dataKey]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFocused(false);
      }
    };

    document.body.classList.add('focus-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('focus-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFocused]);

  if (chartData.length === 0) {
    return (
      <div className="surface-panel rounded-lg p-6">
        <h3 className="mb-4 text-lg font-semibold panel-title">{title}</h3>
        <p className="py-8 text-center panel-muted">No data available</p>
      </div>
    );
  }

  const shouldUseHorizontal = horizontal || (autoHorizontal && chartData.some(item => item[nameKey].length > 14));
  const chartHeight = shouldUseHorizontal ? Math.max(260, chartData.length * 42) : 260;
  const focusHeight = shouldUseHorizontal ? Math.max(520, chartData.length * 48) : 520;
  const total = chartData.reduce((sum, item) => sum + item[dataKey], 0);
  const formatValueLabel = (value) => value.toLocaleString();

  const chart = (height, focusMode = false) => (
    <div className="min-w-0" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        {chartType === 'pie' ? (
          <PieChart>
            <Tooltip
              contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #d9e1ea', color: '#18222f' }}
              formatter={(value) => [`${value.toLocaleString()} (${total ? Math.round((value / total) * 100) : 0}%)`, 'Count']}
            />
            <Legend verticalAlign="bottom" height={focusMode ? 48 : 36} />
            <Pie
              data={chartData}
              dataKey={dataKey}
              nameKey={nameKey}
              innerRadius={focusMode ? 96 : 56}
              outerRadius={focusMode ? 170 : 98}
              paddingAngle={2}
              label={({ name, value }) => `${name}: ${value.toLocaleString()} (${total ? Math.round((value / total) * 100) : 0}%)`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        ) : shouldUseHorizontal ? (
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: showValues ? (focusMode ? 72 : 58) : (focusMode ? 42 : 24), left: focusMode ? 150 : 84, bottom: 8 }}
          >
            <CartesianGrid stroke="#d9e1ea" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#53606d', fontSize: focusMode ? 14 : 12 }} />
            <YAxis type="category" dataKey={nameKey} width={focusMode ? 190 : 130} tick={{ fill: '#53606d', fontSize: focusMode ? 14 : 12 }} />
            <Tooltip
              contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #d9e1ea', color: '#18222f' }}
              formatter={(value) => [value.toLocaleString(), 'Count']}
            />
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
              {showValues && (
                <LabelList
                  dataKey={dataKey}
                  position="right"
                  formatter={formatValueLabel}
                  fill="#35404b"
                  fontSize={focusMode ? 14 : 12}
                  fontWeight={800}
                />
              )}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 8, right: 36, left: 24, bottom: focusMode ? 20 : 8 }}>
            <CartesianGrid stroke="#d9e1ea" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={nameKey}
              tick={{ fill: '#53606d', fontSize: focusMode ? 14 : 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: '#53606d', fontSize: focusMode ? 14 : 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #d9e1ea', color: '#18222f' }}
              formatter={(value) => [value.toLocaleString(), 'Count']}
            />
            <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
              {showValues && (
                <LabelList
                  dataKey={dataKey}
                  position="top"
                  formatter={formatValueLabel}
                  fill="#35404b"
                  fontSize={focusMode ? 14 : 12}
                  fontWeight={800}
                />
              )}
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      <div className="surface-panel rounded-lg p-6">
        <div className="chart-panel-head mb-4">
          <h3 className="mb-0 text-lg font-semibold panel-title">{title}</h3>
          <button
            className="focus-mode-btn"
            type="button"
            onClick={() => setIsFocused(true)}
            aria-label={`Open ${title} in focus mode`}
          >
            Focus mode
          </button>
        </div>
        {chart(chartHeight)}
      </div>

      {isFocused && (
        <div className="focus-overlay" role="dialog" aria-modal="true" aria-label={`${title} focus mode`}>
          <div className="focus-shell">
            <header className="focus-head">
              <div>
                <p className="eyebrow mb-1 text-[var(--teal)]">Focus mode</p>
                <h2 className="h3 mb-1 panel-title">{title}</h2>
                <p className="mb-0 panel-muted">Expanded chart view for detailed reading.</p>
              </div>
              <button
                className="focus-close-btn"
                type="button"
                onClick={() => setIsFocused(false)}
                aria-label="Close focus mode"
              >
                Close
              </button>
            </header>
            <div className="focus-chart-wrap">
              {chart(focusHeight, true)}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
