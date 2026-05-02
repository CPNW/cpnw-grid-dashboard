import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCPNWData } from '../hooks/useCPNWData';
import KPICard from './KPICard';
import PlacementChart from './PlacementChart';
import sporesWatermark from '../assets/spores-watermark.png';

const queryClient = new QueryClient();

const REPORT_TYPES = [
  {
    id: 'inclusive',
    label: 'Inclusive',
    kicker: 'All placement rows',
    description: 'Preceptor and non-preceptor placements combined.',
  },
  {
    id: 'preceptor',
    label: 'Preceptor',
    kicker: 'Preceptor hours present',
    description: 'Only rows where preceptor hours are present.',
  },
  {
    id: 'nonPreceptor',
    label: 'Non Preceptor',
    kicker: 'No preceptor hours',
    description: 'Only rows where preceptor hours are blank or zero.',
  },
];

const QUARTERS = ['Fall', 'Winter', 'Spring', 'Summer'];
const SHIFT_PARAMETERS = {
  Day: '6:00 AM-1:59 PM',
  Evening: '2:00 PM-9:59 PM',
  Night: '10:00 PM-11:59 PM',
};

function makeReportPages(regions) {
  const scopes = [
    { id: 'all', label: 'All Facilities', region: null },
    ...regions.map(region => ({ id: region.toLowerCase(), label: `${region} Region`, region })),
  ];

  return scopes.map(scope => ({
    ...scope,
    pages: REPORT_TYPES.map(type => ({
      id: `${scope.id}-${type.id}`,
      scope,
      type,
      label: `${scope.label} ${type.label}`,
    })),
  }));
}

function parseActivePage(pageId, reportGroups) {
  return reportGroups.flatMap(group => group.pages).find(page => page.id === pageId) || reportGroups[0]?.pages[0];
}

function getFacilityRows(facility, reportType) {
  const rows = facility.rows || [];
  if (reportType === 'inclusive') return rows;
  return rows.filter(row => row.segment === reportType);
}

function getFilterOptions(rows, key) {
  return [...new Set(rows.map(row => row[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b));
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

  rows.forEach(row => {
    aggregate.total += row.placements || 0;
    addValue(aggregate.byShift, row.shift, row.placements);
    addValue(aggregate.byStudentType, row.studentType, row.placements);
    addValue(aggregate.byProgramType, row.programType, row.placements);
    addValue(aggregate.byProgress, row.progress, row.placements);
    addValue(aggregate.byHealthcareFacility, row.healthcareFacility, row.placements);
    addValue(aggregate.byEducationalFacility, row.educationalFacility, row.placements);
    addValue(aggregate.byPreceptorHoursStudentType, row.studentType, row.preceptorHours);
    addValue(aggregate.byPreceptorHoursEducationalFacility, row.educationalFacility, row.preceptorHours);

    if (row.studentType) {
      aggregate.byStudentTypeQuarter[row.studentType] ||= { total: 0, Fall: 0, Winter: 0, Spring: 0, Summer: 0 };
      aggregate.byStudentTypeQuarter[row.studentType].total += row.placements || 0;
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
  const [activePageId, setActivePageId] = useState('all-inclusive');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedHealthcareFacility, setSelectedHealthcareFacility] = useState('');

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
  const activeScope = activePage?.scope || { id: 'all', label: 'All Facilities', region: null };
  const activeType = activePage?.type || REPORT_TYPES[0];

  const scopedFacilities = facilities.filter(facility => !activeScope.region || facility.region === activeScope.region);
  const reportRows = scopedFacilities.flatMap(facility => getFacilityRows(facility, activeType.id));
  const schoolOptions = getFilterOptions(reportRows, 'educationalFacility');
  const programOptions = getFilterOptions(reportRows, 'programType');
  const healthcareFacilityOptions = getFilterOptions(reportRows, 'healthcareFacility');
  const filteredRows = reportRows
    .filter(row => !selectedSchool || row.educationalFacility === selectedSchool)
    .filter(row => !selectedProgram || row.programType === selectedProgram)
    .filter(row => !selectedHealthcareFacility || row.healthcareFacility === selectedHealthcareFacility);
  const data = aggregateRows(filteredRows);
  const educationFacilityCount = Object.keys(data.byEducationalFacility).length;
  const healthcareFacilityCount = Object.keys(data.byHealthcareFacility).length;
  const visibleKpis = [
    { title: 'Total Placements', value: data.total, subtitle: activeScope.label, color: 'blue' },
    { title: 'Fall Placements', value: data.byQuarter.Fall || 0, subtitle: activeType.label, color: 'green' },
    { title: 'Winter Placements', value: data.byQuarter.Winter || 0, subtitle: activeType.label, color: 'indigo' },
    { title: 'Spring Placements', value: data.byQuarter.Spring || 0, subtitle: activeType.label, color: 'purple' },
    { title: 'Summer Placements', value: data.byQuarter.Summer || 0, subtitle: activeType.label, color: 'orange' },
  ];

  const handleAcademicYearChange = (event) => {
    setSelectedAcademicYear(event.target.value);
  };

  const resetReportFilters = () => {
    setSelectedSchool('');
    setSelectedProgram('');
    setSelectedHealthcareFacility('');
  };

  if (isLoading) {
    return (
      <div className="workspace-grid d-flex min-vh-100 align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" aria-label="Loading"></div>
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

  return (
    <div className="workspace-grid min-vh-100 text-[var(--ink)]">
      <div className="container-fluid px-0">
        <div className="row g-0 min-vh-100">
          <aside className="report-sidebar col-12 col-lg-3 col-xxl-2 p-3 p-xl-4">
            <img className="spores-sidebar-mark" src={sporesWatermark} alt="" />

            <div className="brand-lockup mb-4">
              <div className="brand-icon" aria-hidden="true">
                <img src={sporesWatermark} alt="" />
              </div>
              <div>
                <p className="eyebrow mb-1">Clinical Placements Northwest</p>
                <h1 className="h4 mb-1 fw-bold text-white">Grid Reports</h1>
                <p className="mb-0 text-white-50">{activeAcademicYear} planning dashboard</p>
              </div>
            </div>

            <section className="filter-panel mb-3">
              <label className="form-label filter-label" htmlFor="academicYearFilter">Academic Year</label>
              <select
                id="academicYearFilter"
                className="form-select"
                value={activeAcademicYear}
                onChange={handleAcademicYearChange}
              >
                {academicYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <div className="mt-3">
                <label className="form-label filter-label" htmlFor="schoolFilter">School</label>
                <select
                  id="schoolFilter"
                  className="form-select"
                  value={selectedSchool}
                  onChange={event => setSelectedSchool(event.target.value)}
                >
                  <option value="">All Schools</option>
                  {schoolOptions.map(school => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <label className="form-label filter-label" htmlFor="programFilter">Program</label>
                <select
                  id="programFilter"
                  className="form-select"
                  value={selectedProgram}
                  onChange={event => setSelectedProgram(event.target.value)}
                >
                  <option value="">All Programs</option>
                  {programOptions.map(program => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
              </div>
              <div className="mt-3">
                <label className="form-label filter-label" htmlFor="healthcareFacilityFilter">Healthcare Facility</label>
                <select
                  id="healthcareFacilityFilter"
                  className="form-select"
                  value={selectedHealthcareFacility}
                  onChange={event => setSelectedHealthcareFacility(event.target.value)}
                >
                  <option value="">All Healthcare Facilities</option>
                  {healthcareFacilityOptions.map(facility => (
                    <option key={facility} value={facility}>{facility}</option>
                  ))}
                </select>
              </div>
              <button className="btn btn-light fw-bold w-100 mt-3" type="button" onClick={resetReportFilters}>
                Reset filters
              </button>
            </section>

            <section className="report-nav-panel mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h6 fw-bold mb-0 text-white">Report Pages</h2>
                <span className="nav-count">{reportGroups.reduce((total, group) => total + group.pages.length, 0)}</span>
              </div>

              <div className="report-nav-groups">
                {reportGroups.map(group => (
                  <div className="report-nav-group" key={group.id}>
                    <p className="report-nav-heading">{group.label}</p>
                    <div className="d-grid gap-2">
                      {group.pages.map((page, index) => (
                        <button
                          key={page.id}
                          className={`report-nav btn ${activePageId === page.id ? 'active' : ''}`}
                          type="button"
                          onClick={() => setActivePageId(page.id)}
                        >
                          <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
                          <span>
                            <span className="nav-label">{page.type.label}</span>
                            <span className="nav-kicker">{page.type.kicker}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>

          <main className="report-workspace col-12 col-lg-9 col-xxl-10 p-3 p-md-4">
            <section className="report-hero surface-panel rounded-4 p-4 mb-3">
              <img className="spores-hero-mark" src={sporesWatermark} alt="" />
              <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-start">
                <div>
                  <p className="eyebrow mb-1 text-[var(--teal)]">{activeAcademicYear}</p>
                  <h2 className="display-6 fw-bold mb-2 panel-title">{activePage.label}</h2>
                  <p className="hero-copy mb-0">{activeType.description}</p>
                  <p className="selected-facility-label mb-0 mt-2">
                    {educationFacilityCount} education facilities | {healthcareFacilityCount} healthcare facilities
                  </p>
                </div>
                <div className="page-chip-strip" role="tablist" aria-label="Report type pages">
                  {REPORT_TYPES.map(type => (
                    <button
                      key={type.id}
                      className={`page-chip ${activeType.id === type.id ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActivePageId(`${activeScope.id}-${type.id}`)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="row g-3 mb-3" aria-label="Summary metrics">
              {visibleKpis.map(kpi => (
                <div className="col-6 col-xl" key={kpi.title}>
                  <KPICard title={kpi.title} value={kpi.value} subtitle={kpi.subtitle} color={kpi.color} />
                </div>
              ))}
            </section>

            <section className="row g-3">
              <div className="col-12">
                <StudentTypeQuarterTable data={data.byStudentTypeQuarter} />
              </div>
              <div className="col-12">
                <PlacementChart
                  title={activeType.id === 'inclusive' ? 'Total Placements by Progress in Program' : 'Total Placements by Program Type'}
                  data={activeType.id === 'inclusive' ? data.byProgress : data.byProgramType}
                  autoHorizontal={activeType.id !== 'inclusive'}
                />
              </div>
              <div className={activeType.id === 'preceptor' ? 'col-12 col-xl-5' : 'col-12'}>
                {activeType.id === 'nonPreceptor' ? (
                  <ShiftBreakdown title="Total Placements by Shift Type" data={data.byShift} total={data.total} />
                ) : (
                  <PlacementChart title="Start Dates by Quarter" data={data.byQuarter} chartType="pie" />
                )}
              </div>
              {activeType.id === 'preceptor' && (
                <>
                  <div className="col-12 col-xl-7">
                    <PlacementChart
                      title="Total Preceptor Hours by Type of Student"
                      data={data.byPreceptorHoursStudentType}
                      showValues
                    />
                  </div>
                  <div className="col-12">
                    <PlacementChart
                      title="Total Preceptor Hours by School"
                      data={data.byPreceptorHoursEducationalFacility}
                      horizontal
                      showValues
                    />
                  </div>
                </>
              )}
              <div className="col-12 col-xl-6">
                <PlacementChart
                  title="Total Placements by Healthcare Facility"
                  data={data.byHealthcareFacility}
                  horizontal
                  showValues
                />
              </div>
              <div className="col-12 col-xl-6">
                <PlacementChart
                  title="Total Placements by Educational Facility"
                  data={data.byEducationalFacility}
                  horizontal
                  showValues
                />
              </div>
            </section>

            <footer className="mt-4 border-top border-[var(--line)] py-3 text-center small panel-muted">
              Academic Year {activeAcademicYear} | Data from CPNW Clinical Placement Grids
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function StudentTypeQuarterTable({ data }) {
  const rows = Object.entries(data || {})
    .map(([studentType, values]) => ({ studentType, ...values }))
    .sort((a, b) => b.total - a.total);

  return (
    <section className="surface-panel rounded-3 overflow-hidden h-100">
      <div className="border-bottom border-[var(--line)] px-4 py-3">
        <h3 className="h5 fw-bold panel-title mb-0">Type of Students by Quarter</h3>
      </div>
      <div className="table-responsive report-table-scroll">
        <table className="table table-sm table-hover align-middle mb-0 report-table">
          <thead>
            <tr>
              <th>Type of Students</th>
              <th className="text-end">Total</th>
              {QUARTERS.map(quarter => <th className="text-end" key={quarter}>{quarter}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.studentType}>
                <td className="fw-semibold">{row.studentType}</td>
                <td className="text-end fw-semibold">{row.total.toLocaleString()}</td>
                {QUARTERS.map(quarter => (
                  <td className="text-end" key={quarter}>{(row[quarter] || 0).toLocaleString()}</td>
                ))}
              </tr>
            ))}
          </tbody>
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
    <section className="surface-panel rounded-lg p-4 h-100">
      <h3 className="mb-4 text-lg font-semibold panel-title">{title}</h3>
      <div className="shift-breakdown">
        {rows.map(([shift, value]) => {
          const percent = total ? Math.round((value / total) * 100) : 0;
          const shiftParameter = SHIFT_PARAMETERS[shift];

          return (
            <div className="shift-row" key={shift}>
              <div className="d-flex align-items-center justify-content-between gap-3">
                <span>
                  <span className="fw-bold panel-title">{shift}</span>
                  {shiftParameter && <span className="shift-parameter">{shiftParameter}</span>}
                </span>
                <span className="panel-muted">{value.toLocaleString()} | {percent}%</span>
              </div>
              <div className="progress shift-progress" role="progressbar" aria-label={`${shift} ${percent}%`} aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
                <div className="progress-bar" style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          );
        })}
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
