import { useEffect, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from "recharts";
import Icon from "./Icon";

const COLORS = ["#147e83", "#4779ad", "#8c81b1", "#bf8b48"];
const QUARTERS = ["Fall", "Winter", "Spring", "Summer"];

export default function PlacementChart({
  data,
  title,
  description,
  dataKey = "value",
  nameKey = "name",
  horizontal = false,
  chartType = "bar",
  autoHorizontal = true,
  showValues = false,
  compactLimit = 12,
  unit = "Placements",
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dialogRef = useRef(null);
  const focusButtonRef = useRef(null);
  const chartData = Object.entries(data || {})
    .map(([key, value]) => ({
      [nameKey]: String(key).trim(),
      [dataKey]: value,
    }))
    .filter((item) => item[nameKey] && item[dataKey] > 0)
    .sort((a, b) =>
      chartType === "pie"
        ? QUARTERS.indexOf(a[nameKey]) - QUARTERS.indexOf(b[nameKey])
        : b[dataKey] - a[dataKey],
    );
  const total = chartData.reduce((sum, item) => sum + item[dataKey], 0);
  const shouldUseHorizontal =
    horizontal ||
    (autoHorizontal && chartData.some((item) => item[nameKey].length > 14));
  const hasMore = chartType !== "pie" && chartData.length > compactLimit;
  const visibleData =
    hasMore && !showAll ? chartData.slice(0, compactLimit) : chartData;

  useEffect(() => {
    if (!isFocused) return undefined;
    const dialog = dialogRef.current;
    const focusButton = focusButtonRef.current;
    dialog.showModal();
    document.body.classList.add("focus-open");
    return () => {
      dialog.close();
      document.body.classList.remove("focus-open");
      focusButton?.focus();
    };
  }, [isFocused]);

  const tooltip = (
    <Tooltip
      cursor={{ fill: "#147e8309" }}
      contentStyle={{
        background: "#fff",
        borderRadius: 10,
        border: "1px solid #dce5e9",
        boxShadow: "0 8px 28px #142d3a15",
        color: "#163244",
        fontSize: 12,
      }}
      formatter={(value) => [Number(value).toLocaleString(), unit]}
    />
  );
  const renderChart = (focus = false) => {
    const entries = focus ? chartData : visibleData;
    const height =
      chartType === "pie"
        ? focus
          ? 380
          : 216
        : shouldUseHorizontal
          ? Math.max(focus ? 400 : 280, entries.length * 39)
          : focus
            ? 440
            : 280;
    if (!entries.length)
      return <div className="chart-empty">No data for this selection</div>;
    return (
      <div
        className={
          "chart-canvas " + (chartType === "pie" ? "donut-canvas" : "")
        }
        style={{ height }}
      >
        <ResponsiveContainer
          width="100%"
          height={height}
          initialDimension={{ width: 0, height }}
          minWidth={0}
          minHeight={0}
        >
          {chartType === "pie" ? (
            <PieChart>
              {tooltip}
              <Pie
                data={entries}
                isAnimationActive={false}
                dataKey={dataKey}
                nameKey={nameKey}
                innerRadius={focus ? 125 : 70}
                outerRadius={focus ? 160 : 91}
                paddingAngle={4}
                cornerRadius={3}
                startAngle={90}
                endAngle={-270}
                stroke="none"
              >
                {entries.map((entry) => (
                  <Cell
                    key={entry[nameKey]}
                    fill={
                      COLORS[
                        Math.max(0, QUARTERS.indexOf(entry[nameKey])) %
                          COLORS.length
                      ]
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          ) : shouldUseHorizontal ? (
            <BarChart
              data={entries}
              layout="vertical"
              margin={{
                top: 0,
                right: showValues ? 50 : 14,
                left: 0,
                bottom: 0,
              }}
              barSize={12}
            >
              <CartesianGrid stroke="#e9eef0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: "#74838c", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? value / 1000 + "k" : value
                }
              />
              <YAxis
                type="category"
                dataKey={nameKey}
                width={focus ? 230 : 145}
                tick={{ fill: "#526570", fontSize: focus ? 12 : 11 }}
                tickFormatter={(value) =>
                  !focus && value.length > 24 ? value.slice(0, 23) + "…" : value
                }
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              {tooltip}
              <Bar dataKey={dataKey} fill="#147e83" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {showValues && (
                  <LabelList
                    dataKey={dataKey}
                    position="right"
                    formatter={(value) => value.toLocaleString()}
                    fill="#354f5d"
                    fontSize={11}
                    offset={8}
                  />
                )}
              </Bar>
            </BarChart>
          ) : (
            <BarChart
              data={entries}
              margin={{ top: 18, right: 10, left: -18, bottom: 4 }}
              barSize={focus ? 34 : 24}
            >
              <CartesianGrid stroke="#e9eef0" vertical={false} />
              <XAxis
                dataKey={nameKey}
                tick={{ fill: "#74838c", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fill: "#74838c", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              {tooltip}
              <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} fill="#147e83" isAnimationActive={false}>
                {showValues && (
                  <LabelList
                    dataKey={dataKey}
                    position="top"
                    formatter={(value) => value.toLocaleString()}
                    fill="#354f5d"
                    fontSize={11}
                  />
                )}
                {entries.map((entry, index) => (
                  <Cell
                    key={entry[nameKey]}
                    fill={
                      index === 0
                        ? "#147e83"
                        : index < 3
                          ? "#4b9c9e"
                          : "#9dc7c8"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
        {chartType === "pie" && (
          <div className="donut-center" aria-hidden="true">
            <strong>{total.toLocaleString()}</strong>
            <span>annual starts</span>
          </div>
        )}
      </div>
    );
  };
  const legend = chartType === "pie" && chartData.length > 0 && (
    <div className="quarter-legend">
      {chartData.map((entry) => (
        <div key={entry[nameKey]}>
          <span
            className="legend-dot"
            style={{
              background:
                COLORS[
                  Math.max(0, QUARTERS.indexOf(entry[nameKey])) % COLORS.length
                ],
            }}
          />
          <span>{entry[nameKey]}</span>
          <strong>{entry[dataKey].toLocaleString()}</strong>
          <small>
            {total ? Math.round((entry[dataKey] / total) * 100) : 0}%
          </small>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <section className="surface-panel chart-panel">
        <div className="chart-panel-head">
          <div>
            <h3>{title}</h3>
            {description && <p>{description}</p>}
          </div>
          <button
            ref={focusButtonRef}
            className="focus-mode-btn"
            type="button"
            onClick={() => setIsFocused(true)}
            aria-label={"Expand " + title}
            title="Expand chart"
          >
            <Icon name="expand" size={16} />
          </button>
        </div>
        {renderChart()}
        {legend}
        {hasMore && (
          <div className="chart-bottom">
            <span>
              {showAll
                ? "All " + chartData.length
                : "Top " + compactLimit + " of " + chartData.length}{" "}
              categories
            </span>
            <button
              type="button"
              aria-expanded={showAll}
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Show less" : "View all"}
              <Icon name="arrow" size={14} />
            </button>
          </div>
        )}
      </section>
      <dialog
        ref={dialogRef}
        className="focus-dialog"
        aria-labelledby={"focus-" + title.replaceAll(" ", "-")}
        onCancel={() => setIsFocused(false)}
        onClose={() => setIsFocused(false)}
      >
        {isFocused && (
          <>
            <header className="focus-head">
              <div>
                <p className="eyebrow">DETAILED VIEW</p>
                <h2 id={"focus-" + title.replaceAll(" ", "-")}>{title}</h2>
                <p>
                  {chartData.length} categories · {total.toLocaleString()}{" "}
                  {unit.toLowerCase()}
                </p>
              </div>
              <button
                className="focus-close-btn"
                type="button"
                onClick={() => setIsFocused(false)}
                aria-label="Close expanded chart"
              >
                <Icon name="close" size={20} />
              </button>
            </header>
            <div className="focus-chart-wrap">
              {renderChart(true)}
              {legend}
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
