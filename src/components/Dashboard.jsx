import { useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCPNWData } from "../hooks/useCPNWData";
import KPICard from "./KPICard";
import PlacementChart from "./PlacementChart";
import Icon from "./Icon";
import sporesWatermark from "../assets/spores-watermark.png";

const queryClient = new QueryClient();

const REPORT_TYPES = [
  {
    id: "inclusive",
    label: "All placements",
    kicker: "All placement rows",
    description: "Preceptor and non-preceptor placements combined.",
  },
  {
    id: "preceptor",
    label: "Preceptor",
    kicker: "Preceptor hours present",
    description: "Only rows where preceptor hours are present.",
  },
  {
    id: "nonPreceptor",
    label: "Non-preceptor",
    kicker: "No preceptor hours",
    description: "Only rows where preceptor hours are blank or zero.",
  },
];

const QUARTERS = ["Fall", "Winter", "Spring", "Summer"];
const SHIFT_PARAMETERS = {
  Day: "6:00 AM-1:59 PM",
  Evening: "2:00 PM-9:59 PM",
  Night: "10:00 PM-11:59 PM",
};

function makeReportPages(regions) {
  const scopes = [
    { id: "all", label: "All Facilities", region: null },
    ...regions.map((region) => ({
      id: region.toLowerCase(),
      label: `${region} Region`,
      region,
    })),
  ];

  return scopes.map((scope) => ({
    ...scope,
    pages: REPORT_TYPES.map((type) => ({
      id: `${scope.id}-${type.id}`,
      scope,
      type,
      label: `${scope.label} ${type.label}`,
    })),
  }));
}

function parseActivePage(pageId, reportGroups) {
  return (
    reportGroups
      .flatMap((group) => group.pages)
      .find((page) => page.id === pageId) || reportGroups[0]?.pages[0]
  );
}

function getFacilityRows(facility, reportType) {
  const rows = facility.rows || [];
  if (reportType === "inclusive") return rows;
  return rows.filter((row) => row.segment === reportType);
}

function getFilterOptions(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

function aggregateRows(rows) {
  const aggregate = {
    total: 0,
    byShift: {},
    byStudentType: {},
    byProgress: {},
    byQuarter: {},
    byHealthcareFacility: {},
    byEducationalFacility: {},
    byProgramType: {},
    byStudentTypeQuarter: {},
    byPreceptorHoursStudentType: {},
    byPreceptorHoursEducationalFacility: {},
  };

  const addValue = (target, key, value) => {
    if (!key || value <= 0) return;
    target[key] = (target[key] || 0) + value;
  };

  rows.forEach((row) => {
    aggregate.total += row.placements || 0;
    addValue(aggregate.byShift, row.shift, row.placements);
    addValue(aggregate.byStudentType, row.studentType, row.placements);
    addValue(aggregate.byProgramType, row.programType, row.placements);
    addValue(aggregate.byProgress, row.progress, row.placements);
    addValue(
      aggregate.byHealthcareFacility,
      row.healthcareFacility,
      row.placements,
    );
    addValue(
      aggregate.byEducationalFacility,
      row.educationalFacility,
      row.placements,
    );
    addValue(
      aggregate.byPreceptorHoursStudentType,
      row.studentType,
      row.preceptorHours,
    );
    addValue(
      aggregate.byPreceptorHoursEducationalFacility,
      row.educationalFacility,
      row.preceptorHours,
    );

    if (row.studentType) {
      aggregate.byStudentTypeQuarter[row.studentType] ||= {
        total: 0,
        Fall: 0,
        Winter: 0,
        Spring: 0,
        Summer: 0,
      };
      aggregate.byStudentTypeQuarter[row.studentType].total +=
        row.placements || 0;
    }

    Object.entries(row.byQuarter || {}).forEach(([quarter, value]) => {
      addValue(aggregate.byQuarter, quarter, value);
      if (row.studentType) {
        aggregate.byStudentTypeQuarter[row.studentType][quarter] += value;
      }
    });
  });

  return aggregate;
}

function DashboardContent() {
  const [activePageId, setActivePageId] = useState("all-inclusive");
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedHealthcareFacility, setSelectedHealthcareFacility] =
    useState("");

  const {
    academicYears,
    selectedAcademicYear: activeAcademicYear,
    facilities,
    isLoading,
    error,
    regions,
  } = useCPNWData(selectedAcademicYear);

  const reportGroups = useMemo(() => makeReportPages(regions), [regions]);
  const activePage = parseActivePage(activePageId, reportGroups);
  const activeScope = activePage?.scope || {
    id: "all",
    label: "All Facilities",
    region: null,
  };
  const activeType = activePage?.type || REPORT_TYPES[0];

  const scopedFacilities = facilities.filter(
    (facility) => !activeScope.region || facility.region === activeScope.region,
  );
  const reportRows = scopedFacilities.flatMap((facility) =>
    getFacilityRows(facility, activeType.id),
  );
  const schoolOptions = getFilterOptions(reportRows, "educationalFacility");
  const programOptions = getFilterOptions(reportRows, "programType");
  const healthcareFacilityOptions = getFilterOptions(
    reportRows,
    "healthcareFacility",
  );
  const filteredRows = reportRows
    .filter(
      (row) => !selectedSchool || row.educationalFacility === selectedSchool,
    )
    .filter((row) => !selectedProgram || row.programType === selectedProgram)
    .filter(
      (row) =>
        !selectedHealthcareFacility ||
        row.healthcareFacility === selectedHealthcareFacility,
    );
  const data = aggregateRows(filteredRows);
  const educationFacilityCount = Object.keys(data.byEducationalFacility).length;
  const healthcareFacilityCount = Object.keys(data.byHealthcareFacility).length;
  const handleAcademicYearChange = (event) => {
    setSelectedAcademicYear(event.target.value);
    resetReportFilters();
  };

  const resetReportFilters = () => {
    setSelectedSchool("");
    setSelectedProgram("");
    setSelectedHealthcareFacility("");
  };

  if (isLoading) {
    return (
      <div className="workspace-grid d-flex min-vh-100 align-items-center justify-content-center">
        <div className="text-center">
          <div
            className="spinner-border text-primary"
            role="status"
            aria-label="Loading"
          ></div>
          <p className="mt-3 panel-muted">Loading CPNW Grid Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-grid d-flex min-vh-100 align-items-center justify-content-center">
        <div className="surface-panel rounded-3 p-4 text-center">
          <p className="fs-5 text-danger">Error loading data</p>
          <p className="mb-0 panel-muted">{error.message}</p>
        </div>
      </div>
    );
  }

  const changeReport = (scope, type) => {
    setActivePageId(scope + "-" + type);
    resetReportFilters();
  };
  const filterCount = [
    selectedSchool,
    selectedProgram,
    selectedHealthcareFacility,
  ].filter(Boolean).length;
  const quarterTotal = QUARTERS.reduce(
    (sum, quarter) => sum + (data.byQuarter[quarter] || 0),
    0,
  );
  const quarterColors = ["#147e83", "#4779ad", "#8c81b1", "#bf8b48"];
  const exportSummary = () => {
    const csvRows = [
      ["CPNW Placement Summary", activeAcademicYear],
      ["Region", activeScope.label],
      ["Report", activeType.label],
      ["School", selectedSchool || "All schools"],
      ["Program", selectedProgram || "All programs"],
      [
        "Healthcare facility",
        selectedHealthcareFacility || "All healthcare facilities",
      ],
      [],
      ["Student type", "Total placements", ...QUARTERS],
      ...Object.entries(data.byStudentTypeQuarter)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([type, values]) => [
          type,
          values.total,
          ...QUARTERS.map((quarter) => values[quarter] || 0),
        ]),
      [
        "Total",
        data.total,
        ...QUARTERS.map((quarter) => data.byQuarter[quarter] || 0),
      ],
    ];
    const csv = csvRows
      .map((row) =>
        row
          .map((value) => {
            let cell = String(value);
            if (/^[=+\-@\t\r]/.test(cell)) cell = "'" + cell;
            return '"' + cell.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "cpnw-" + activeAcademicYear + "-" + activePage.id + ".csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#report-content">
        Skip to report
      </a>
      <aside className="report-sidebar">
        <a
          className="brand-lockup"
          href="#report-content"
          aria-label="CPNW Grid Reports home"
          onClick={() => changeReport("all", "inclusive")}
        >
          <span className="brand-icon">
            <img src={sporesWatermark} alt="" />
          </span>
          <span>
            <strong>
              CPNW<span className="brand-period">.</span>
            </strong>
            <small>Clinical Placements Northwest</small>
          </span>
        </a>
        <div className="sidebar-section-label">WORKSPACE</div>
        <div className="workspace-name">
          <Icon name="grid" />
          <span>Grid reports</span>
          <span className="workspace-dot" />
        </div>
        <nav className="region-nav" aria-label="Report region">
          <p className="sidebar-section-label">EXPLORE BY REGION</p>
          {reportGroups.map((group) => (
            <button
              key={group.id}
              className={
                "region-link " + (activeScope.id === group.id ? "active" : "")
              }
              type="button"
              aria-current={activeScope.id === group.id ? "page" : undefined}
              onClick={() => changeReport(group.id, activeType.id)}
            >
              <Icon name={group.id === "all" ? "grid" : "compass"} size={18} />
              <span>{group.id === "all" ? "All facilities" : group.label}</span>
              {activeScope.id === group.id && <Icon name="arrow" size={16} />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <Icon name="school" size={22} />
            </span>
            <h2>
              Better insight.
              <br />
              Stronger placements.
            </h2>
            <p>A shared view of clinical education across the Northwest.</p>
          </div>
          <div className="source-status">
            <span />
            CPNW clinical grid data
          </div>
          <p className="sidebar-caption">Built for a connected Northwest.</p>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb-label">
            Workspace <span>/</span> <strong>Grid reports</strong>
          </div>
          <div className="topbar-actions">
            <div className="year-control">
              <Icon name="calendar" size={17} />
              <label htmlFor="academicYearFilter" className="visually-hidden">
                Academic year
              </label>
              <select
                id="academicYearFilter"
                value={activeAcademicYear}
                onChange={handleAcademicYearChange}
              >
                {academicYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="export-button"
              type="button"
              onClick={exportSummary}
              aria-label="Export summary"
            >
              <Icon name="download" size={17} />
              <span>Export summary</span>
            </button>
          </div>
        </header>
        <main className="report-workspace" id="report-content" tabIndex={-1}>
          <section className="report-intro" aria-labelledby="report-title">
            <div>
              <p className="eyebrow">
                <span />
                THE BIG PICTURE
              </p>
              <h1 id="report-title">
                {activeScope.id === "all"
                  ? "Placement overview"
                  : activeScope.label + " overview"}
                <span className="title-period">.</span>
              </h1>
              <p className="intro-description">
                A clearer view of clinical placements. A stronger plan for
                what’s next.
              </p>
            </div>
            <div className="coverage-summary">
              <span>
                <Icon name="school" size={18} />
                <strong>{educationFacilityCount}</strong> schools
              </span>
              <span>
                <Icon name="building" size={18} />
                <strong>{healthcareFacilityCount}</strong> healthcare facilities
              </span>
            </div>
          </section>
          <div className="report-toolbar">
            <div
              className="report-type-switch"
              role="group"
              aria-label="Report type"
            >
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  aria-pressed={activeType.id === type.id}
                  className={activeType.id === type.id ? "active" : ""}
                  onClick={() => changeReport(activeScope.id, type.id)}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <span className="report-context">
              {activeType.id === "inclusive"
                ? "Preceptor + non-preceptor"
                : activeType.id === "preceptor"
                  ? "With preceptor hours"
                  : "Without preceptor hours"}
            </span>
          </div>
          <section className="filter-bar" aria-label="Filter placements">
            <div className="filter-indicator">
              <Icon name="filter" size={20} />
              <span>Filters{filterCount > 0 && <b>{filterCount}</b>}</span>
            </div>
            <FilterSelect
              id="schoolFilter"
              label="School"
              value={selectedSchool}
              onChange={(event) => setSelectedSchool(event.target.value)}
              options={schoolOptions}
              placeholder="All schools"
            />
            <FilterSelect
              id="programFilter"
              label="Program"
              value={selectedProgram}
              onChange={(event) => setSelectedProgram(event.target.value)}
              options={programOptions}
              placeholder="All programs"
            />
            <FilterSelect
              id="healthcareFacilityFilter"
              label="Healthcare facility"
              value={selectedHealthcareFacility}
              onChange={(event) =>
                setSelectedHealthcareFacility(event.target.value)
              }
              options={healthcareFacilityOptions}
              placeholder="All healthcare facilities"
            />
            <button
              className="reset-button"
              type="button"
              onClick={resetReportFilters}
              disabled={!filterCount}
              aria-label="Reset filters"
            >
              <Icon name="reset" size={17} />
              <span>Reset</span>
            </button>
          </section>
          <section
            className="metrics-grid"
            aria-label="Summary metrics"
            aria-live="polite"
          >
            <KPICard
              title="Total placements"
              value={data.total}
              subtitle={activeScope.label}
              featured
            />
            {QUARTERS.map((quarter, index) => (
              <KPICard
                key={quarter}
                title={quarter}
                value={data.byQuarter[quarter] || 0}
                subtitle="annual starts"
                color={quarterColors[index]}
                share={
                  quarterTotal
                    ? Math.round(
                        ((data.byQuarter[quarter] || 0) / quarterTotal) * 100,
                      )
                    : 0
                }
              />
            ))}
          </section>
          {!filteredRows.length && (
            <div className="empty-notice" role="status">
              <Icon name="filter" />
              <div>
                <strong>No placements match these filters.</strong>
                <p>Try a different school, program, or facility.</p>
              </div>
              <button type="button" onClick={resetReportFilters}>
                Clear filters <Icon name="arrow" size={16} />
              </button>
            </div>
          )}
          <section
            className="report-section"
            aria-labelledby="distribution-heading"
          >
            <div className="section-heading">
              <h2 id="distribution-heading">Placement distribution</h2>
              <span>{activeAcademicYear} academic year</span>
            </div>
            <div className="overview-charts">
              <PlacementChart
                title={
                  activeType.id === "inclusive"
                    ? "Progress in program"
                    : "Program types"
                }
                description={
                  activeType.id === "inclusive"
                    ? "Placements by stage of education"
                    : "Placements by nursing program"
                }
                data={
                  activeType.id === "inclusive"
                    ? data.byProgress
                    : data.byProgramType
                }
                autoHorizontal={false}
              />
              {activeType.id === "nonPreceptor" ? (
                <ShiftBreakdown
                  title="Shift distribution"
                  data={data.byShift}
                  total={data.total}
                />
              ) : (
                <PlacementChart
                  title="Quarterly breakdown"
                  description="Placement starts across the academic year"
                  data={data.byQuarter}
                  chartType="pie"
                />
              )}
            </div>
          </section>
          <StudentTypeQuarterTable data={data.byStudentTypeQuarter} />
          {activeType.id === "preceptor" && (
            <section className="report-section">
              <div className="section-heading">
                <h2>Preceptor hours</h2>
                <span>A closer look at supervised learning</span>
              </div>
              <div className="facility-charts">
                <PlacementChart
                  title="Hours by student type"
                  data={data.byPreceptorHoursStudentType}
                  showValues
                  unit="Hours"
                />
                <PlacementChart
                  title="Hours by school"
                  data={data.byPreceptorHoursEducationalFacility}
                  horizontal
                  showValues
                  compactLimit={8}
                  unit="Hours"
                />
              </div>
            </section>
          )}
          <section
            className="report-section"
            aria-labelledby="partners-heading"
          >
            <div className="section-heading">
              <h2 id="partners-heading">Our placement network</h2>
              <span>Explore placements by partner</span>
            </div>
            <div className="facility-charts">
              <PlacementChart
                title="Healthcare facilities"
                description="Total placements by healthcare partner"
                data={data.byHealthcareFacility}
                horizontal
                showValues
                compactLimit={8}
              />
              <PlacementChart
                title="Educational facilities"
                description="Total placements by school"
                data={data.byEducationalFacility}
                horizontal
                showValues
                compactLimit={8}
              />
            </div>
          </section>
          <footer className="report-footer">
            <span>
              <span className="footer-mark">CPNW</span> Clinical Placements
              Northwest
            </span>
            <span>{activeAcademicYear} · Clinical Placement Grids</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function FilterSelect({ id, label, value, onChange, options, placeholder }) {
  return (
    <div className="filter-field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function StudentTypeQuarterTable({ data }) {
  const rows = Object.entries(data || {})
    .map(([studentType, values]) => ({ studentType, ...values }))
    .sort((a, b) => b.total - a.total);
  const totals = ["total", ...QUARTERS].map((key) =>
    rows.reduce((sum, row) => sum + (row[key] || 0), 0),
  );
  return (
    <section
      className="surface-panel student-panel"
      aria-labelledby="students-heading"
    >
      <div className="table-panel-heading">
        <div>
          <h2 id="students-heading">Students by quarter</h2>
          <p>A breakdown of placements by student type</p>
        </div>
        <span className="subtle-badge">{rows.length} student types</span>
      </div>
      <div
        className="report-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Students by quarter table, scroll for more"
      >
        <table className="report-table">
          <caption className="visually-hidden">
            Placement counts by student type and quarter
          </caption>
          <thead>
            <tr>
              <th scope="col">Student type</th>
              <th scope="col">Total placements</th>
              {QUARTERS.map((quarter) => (
                <th scope="col" key={quarter}>
                  {quarter}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.studentType}>
                  <th scope="row">
                    <span className="student-tag">{row.studentType}</span>
                  </th>
                  <td className="total-cell">{row.total.toLocaleString()}</td>
                  {QUARTERS.map((quarter) => (
                    <td key={quarter}>
                      {(row[quarter] || 0).toLocaleString()}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="table-empty">
                  No placements to display
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Total</th>
              {totals.map((total, index) => (
                <td key={index}>{total.toLocaleString()}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function ShiftBreakdown({ data, total, title }) {
  const rows = Object.entries(data || {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  return (
    <section className="surface-panel chart-panel">
      <div className="chart-panel-head">
        <div>
          <h3>{title}</h3>
          <p>Placements across the day</p>
        </div>
        <Icon name="compass" size={19} />
      </div>
      <div className="shift-breakdown">
        {rows.length ? (
          rows.map(([shift, value]) => {
            const percent = total ? Math.round((value / total) * 100) : 0;
            return (
              <div className="shift-row" key={shift}>
                <div className="shift-label">
                  <span>
                    <strong>{shift}</strong>
                    {SHIFT_PARAMETERS[shift] && (
                      <small>{SHIFT_PARAMETERS[shift]}</small>
                    )}
                  </span>
                  <span>
                    {value.toLocaleString()} <small>{percent}%</small>
                  </span>
                </div>
                <div
                  className="shift-progress"
                  role="progressbar"
                  aria-label={shift + " placements"}
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: percent + "%" }} />
                </div>
              </div>
            );
          })
        ) : (
          <p className="chart-empty">No shift data for this selection</p>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
}
