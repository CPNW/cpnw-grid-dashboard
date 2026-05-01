import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCPNWData } from '../hooks/useCPNWData';
import KPICard from './KPICard';
import PlacementChart from './PlacementChart';
import sporesWatermark from '../assets/spores-watermark.png';

const queryClient = new QueryClient();

const REPORT_PAGES = [
  { id: 'overview', label: 'Overview', kicker: 'Executive view', description: 'Regional capacity, quarterly demand, student mix, and shift coverage.' },
  { id: 'regions', label: 'Regions', kicker: 'Compare markets', description: 'East, North, and South region placement totals side by side.' },
  { id: 'facilities', label: 'Facilities', kicker: 'Rank capacity', description: 'Top facility totals and facility-level placement scale.' },
  { id: 'quarters', label: 'Quarters', kicker: 'Plan rotations', description: 'Quarter starts and program progress for planning conversations.' },
  { id: 'table', label: 'Rows', kicker: 'Audit detail', description: 'Facility rows for validating totals and source workbook coverage.' },
];

function sumValues(values = {}) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function getTopEntry(values = {}) {
  return Object.entries(values)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])[0] || ['None', 0];
}

function getMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function groupByRegion(facilities) {
  return facilities.reduce((regions, facility) => {
    const region = regions[facility.region] || {
      name: facility.region,
      facilities: 0,
      placements: 0,
      byQuarter: {},
    };

    region.facilities += 1;
    region.placements += facility.placements.total;
    Object.entries(facility.placements.byQuarter).forEach(([quarter, value]) => {
      region.byQuarter[quarter] = (region.byQuarter[quarter] || 0) + value;
    });

    regions[facility.region] = region;
    return regions;
  }, {});
}

function DashboardContent() {
  const [activePage, setActivePage] = useState('overview');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('North');
  const [selectedFacility, setSelectedFacility] = useState(null);

  const {
    academicYears,
    selectedAcademicYear: activeAcademicYear,
    selectedDataset,
    facilities,
    aggregated,
    isLoading,
    error,
    regions,
    regionFacilities,
    totalFacilities,
  } = useCPNWData(selectedAcademicYear, selectedRegion, selectedFacility);

  const handleAcademicYearChange = (event) => {
    setSelectedAcademicYear(event.target.value);
    setSelectedFacility(null);
  };

  const handleRegionChange = (event) => {
    setSelectedRegion(event.target.value || null);
    setSelectedFacility(null);
  };

  const handleFacilityChange = (event) => {
    setSelectedFacility(event.target.value || null);
  };

  const clearFilters = () => {
    setSelectedRegion(null);
    setSelectedFacility(null);
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

  const data = aggregated;
  const filteredFacilities = facilities
    .filter(facility => !selectedRegion || facility.region === selectedRegion)
    .filter(facility => !selectedFacility || facility.name === selectedFacility);
  const topFacilities = [...filteredFacilities].sort((a, b) => b.placements.total - a.placements.total);
  const regionSummaries = Object.values(groupByRegion(facilities)).sort((a, b) => b.placements - a.placements);
  const regionChartData = Object.fromEntries(regionSummaries.map(region => [region.name, region.placements]));
  const averagePlacements = filteredFacilities.length ? Math.round(data.total / filteredFacilities.length) : 0;
  const scopeLabel = selectedFacility || (selectedRegion ? `${selectedRegion} Region` : 'All Regions');
  const sourceCount = selectedDataset.sourceCount || totalFacilities;
  const activePageMeta = REPORT_PAGES.find(page => page.id === activePage) || REPORT_PAGES[0];
  const topFacility = topFacilities[0];
  const lowestRegion = regionSummaries[regionSummaries.length - 1];
  const leadingRegion = regionSummaries[0];
  const [busiestQuarter, busiestQuarterValue] = getTopEntry(data.byQuarter);
  const [largestStudentType, largestStudentTypeValue] = getTopEntry(data.byStudentType);
  const [largestShiftType, largestShiftTypeValue] = getTopEntry(data.byShift);
  const quarterStarts = sumValues(data.byQuarter);
  const facilityMedian = getMedian(filteredFacilities.map(facility => facility.placements.total));
  const regionSpread = leadingRegion && lowestRegion ? leadingRegion.placements - lowestRegion.placements : 0;
  const reportKpis = {
    overview: [
      { title: 'Facilities', value: filteredFacilities.length, subtitle: `${totalFacilities} in selected year`, color: 'blue' },
      { title: 'Placements', value: data.total, subtitle: scopeLabel, color: 'green' },
      { title: 'Avg. Per Facility', value: averagePlacements, subtitle: 'Placement density', color: 'indigo' },
      { title: 'Top Facility', value: topFacility?.placements.total || 0, subtitle: topFacility?.name || 'No facility selected', color: 'purple' },
      { title: 'Source Files', value: sourceCount, subtitle: `${activeAcademicYear} workbooks`, color: 'orange' },
    ],
    regions: [
      { title: 'Regions', value: regionSummaries.length, subtitle: 'Reporting markets', color: 'blue' },
      { title: 'Leading Region', value: leadingRegion?.name || 'None', subtitle: `${(leadingRegion?.placements || 0).toLocaleString()} placements`, color: 'green' },
      { title: 'Region Spread', value: regionSpread, subtitle: 'High minus low placements', color: 'purple' },
      { title: 'Facilities', value: totalFacilities, subtitle: 'Across all regions', color: 'indigo' },
      { title: 'Selected Scope', value: filteredFacilities.length, subtitle: scopeLabel, color: 'orange' },
    ],
    facilities: [
      { title: 'Facilities', value: filteredFacilities.length, subtitle: scopeLabel, color: 'blue' },
      { title: 'Top Facility', value: topFacility?.placements.total || 0, subtitle: topFacility?.name || 'No facility selected', color: 'green' },
      { title: 'Median Facility', value: facilityMedian, subtitle: 'Middle placement total', color: 'indigo' },
      { title: 'Average', value: averagePlacements, subtitle: 'Per facility', color: 'purple' },
      { title: 'Source Files', value: sourceCount, subtitle: `${activeAcademicYear} workbooks`, color: 'orange' },
    ],
    quarters: [
      { title: 'Quarter Starts', value: quarterStarts, subtitle: 'All selected quarters', color: 'blue' },
      { title: 'Busiest Quarter', value: busiestQuarter, subtitle: `${busiestQuarterValue.toLocaleString()} starts`, color: 'green' },
      { title: 'Program Labels', value: Object.keys(data.byProgress).length, subtitle: 'Progress categories', color: 'indigo' },
      { title: 'Student Mix', value: Object.keys(data.byStudentType).length, subtitle: `${largestStudentType}: ${largestStudentTypeValue.toLocaleString()}`, color: 'purple' },
      { title: 'Shift Models', value: Object.keys(data.byShift).length, subtitle: `${largestShiftType}: ${largestShiftTypeValue.toLocaleString()}`, color: 'orange' },
    ],
    table: [
      { title: 'Facility Rows', value: filteredFacilities.length, subtitle: scopeLabel, color: 'blue' },
      { title: 'Placements', value: data.total, subtitle: 'Filtered total', color: 'green' },
      { title: 'Academic Year', value: activeAcademicYear, subtitle: 'Selected source year', color: 'indigo' },
      { title: 'Source Files', value: sourceCount, subtitle: 'Generated dataset', color: 'purple' },
      { title: 'Quarter Starts', value: quarterStarts, subtitle: 'Filtered rows', color: 'orange' },
    ],
  };
  const visibleKpis = reportKpis[activePage] || reportKpis.overview;

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

            <section className="report-nav-panel mb-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h2 className="h6 fw-bold mb-0 text-white">Report Pages</h2>
                <span className="nav-count">{REPORT_PAGES.length}</span>
              </div>
                <div className="d-grid gap-2">
                {REPORT_PAGES.map((page, index) => (
                    <button
                      key={page.id}
                      className={`report-nav btn ${activePage === page.id ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActivePage(page.id)}
                    >
                    <span className="nav-index">{String(index + 1).padStart(2, '0')}</span>
                    <span>
                      <span className="nav-label">{page.label}</span>
                      <span className="nav-kicker">{page.kicker}</span>
                    </span>
                    </button>
                  ))}
                </div>
            </section>

            <section className="filter-panel mb-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h6 fw-bold mb-0 text-white">Report Lens</h2>
                <span className="scope-chip">{scopeLabel}</span>
              </div>

              <div className="mb-3">
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
            </div>

            <div className="mb-3">
              <label className="form-label filter-label" htmlFor="regionFilter">Region</label>
              <select
                id="regionFilter"
                className="form-select"
                value={selectedRegion || ''}
                onChange={handleRegionChange}
              >
                <option value="">All Regions</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region} Region</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label filter-label" htmlFor="facilityFilter">Healthcare Facility</label>
              <select
                id="facilityFilter"
                className="form-select"
                value={selectedFacility || ''}
                onChange={handleFacilityChange}
                disabled={!selectedRegion}
              >
                <option value="">All {selectedRegion || ''} Facilities</option>
                {regionFacilities.map(facility => (
                  <option key={facility} value={facility}>{facility}</option>
                ))}
              </select>
            </div>

              <button className="btn btn-light fw-bold w-100" type="button" onClick={clearFilters}>
              Reset filters
            </button>
            </section>

            <div className="sidebar-stat-grid">
              <div>
                <span>{filteredFacilities.length}</span>
                <p>Displayed</p>
              </div>
              <div>
                <span>{sourceCount}</span>
                <p>Sources</p>
              </div>
            </div>
          </aside>

          <main className="report-workspace col-12 col-lg-9 col-xxl-10 p-3 p-md-4">
            <section className="report-hero surface-panel rounded-4 p-4 mb-3">
              <img className="spores-hero-mark" src={sporesWatermark} alt="" />
              <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-start">
              <div>
                  <p className="eyebrow mb-1 text-[var(--teal)]">{activeAcademicYear}</p>
                  <h2 className="display-6 fw-bold mb-2 panel-title">{activePageMeta.label}</h2>
                  <p className="hero-copy mb-0">{activePageMeta.description}</p>
                  <p className="selected-facility-label mb-0 mt-2">{scopeLabel}</p>
              </div>
                <div className="page-chip-strip" role="tablist" aria-label="Dashboard pages">
                  {REPORT_PAGES.map(page => (
                  <button
                    key={page.id}
                      className={`page-chip ${activePage === page.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActivePage(page.id)}
                  >
                      {page.label}
                  </button>
                ))}
                </div>
              </div>
            </section>

            <section className="row g-3 mb-3" aria-label="Summary metrics">
              {visibleKpis.map(kpi => (
                <div className="col-6 col-xl" key={`${activePage}-${kpi.title}`}>
                  <KPICard
                    title={kpi.title}
                    value={kpi.value}
                    subtitle={kpi.subtitle}
                    color={kpi.color}
                  />
                </div>
              ))}
            </section>

            {activePage === 'overview' && (
              <section className="row g-3">
                <div className="col-12 col-xl-6">
                  <PlacementChart title="Total Placements by Healthcare Region" data={regionChartData} />
                </div>
                <div className="col-12 col-xl-6">
                  <PlacementChart title="Total Placements by Quarter" data={data.byQuarter} />
                </div>
                <div className="col-12 col-xl-6">
                  <PlacementChart title="Total Placements by Student Type" data={data.byStudentType} />
                </div>
                <div className="col-12 col-xl-6">
                  <PlacementChart title="Total Placements by Shift Type" data={data.byShift} />
                </div>
              </section>
            )}

            {activePage === 'regions' && (
              <section className="row g-3">
                {regionSummaries.map(region => (
                  <div className="col-12 col-xl-4" key={region.name}>
                    <article className="surface-panel h-100 rounded-3 p-4">
                      <p className="eyebrow mb-1 text-[var(--teal)]">{region.name} Region</p>
                      <h3 className="h2 fw-bold panel-title">{region.placements.toLocaleString()}</h3>
                      <p className="panel-muted mb-3">{region.facilities} facilities</p>
                      <div className="small panel-muted">
                        Fall {region.byQuarter.Fall || 0} · Winter {region.byQuarter.Winter || 0} · Spring {region.byQuarter.Spring || 0}
                      </div>
                    </article>
                  </div>
                ))}
                <div className="col-12">
                  <PlacementChart title="Region Placement Comparison" data={regionChartData} horizontal />
                </div>
              </section>
            )}

            {activePage === 'facilities' && (
              <section className="row g-3">
                <div className="col-12 col-xl-7">
                  <PlacementChart
                    title="Top Facilities by Total Placements"
                    data={Object.fromEntries(topFacilities.slice(0, 12).map(facility => [facility.name, facility.placements.total]))}
                    horizontal
                  />
                </div>
                <div className="col-12 col-xl-5">
                  <FacilityTable facilities={topFacilities.slice(0, 10)} title="Largest Facility Totals" />
                </div>
              </section>
            )}

            {activePage === 'quarters' && (
              <section className="row g-3">
                <div className="col-12 col-xl-5">
                  <PlacementChart title="Quarter Capacity" data={data.byQuarter} />
                </div>
                <div className="col-12 col-xl-7">
                  <PlacementChart title="Program Progress" data={data.byProgress} horizontal />
                </div>
              </section>
            )}

            {activePage === 'table' && (
              <FacilityTable facilities={topFacilities} title={`${scopeLabel} Facility Rows`} />
            )}

            <footer className="mt-4 border-top border-[var(--line)] py-3 text-center small panel-muted">
              Academic Year {activeAcademicYear} | Data from CPNW Clinical Placement Grids
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}

function FacilityTable({ facilities, title }) {
  return (
    <section className="surface-panel rounded-3 overflow-hidden">
      <div className="border-bottom border-[var(--line)] px-4 py-3">
        <h3 className="h5 fw-bold panel-title mb-0">{title}</h3>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle mb-0 report-table">
          <thead>
            <tr>
              <th>Facility</th>
              <th>Region</th>
              <th className="text-end">Placements</th>
              <th className="student-type-col">Top Student Type</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(facility => {
              const [studentType, studentTypeTotal] = getTopEntry(facility.placements.byStudentType);

              return (
                <tr key={`${facility.region}-${facility.name}`}>
                  <td className="fw-semibold">{facility.name}</td>
                  <td>{facility.region}</td>
                  <td className="text-end fw-semibold">{facility.placements.total.toLocaleString()}</td>
                  <td className="student-type-col">
                    <span className="fw-semibold">{studentType}</span>
                    <span className="panel-muted"> · {studentTypeTotal.toLocaleString()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
