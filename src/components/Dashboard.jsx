import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCPNWData } from '../hooks/useCPNWData';
import KPICard from './KPICard';
import PlacementChart from './PlacementChart';

const queryClient = new QueryClient();

const REPORT_PAGES = [
  { id: 'overview', label: 'Regional Overview' },
  { id: 'regions', label: 'Region Comparison' },
  { id: 'facilities', label: 'Facility Detail' },
  { id: 'quarters', label: 'Quarter Planning' },
  { id: 'table', label: 'Facility Rows' },
];

function sumValues(values = {}) {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

function getQuarterTotal(data, quarter) {
  return Object.entries(data.byQuarter)
    .filter(([key]) => key.trim() === quarter)
    .reduce((sum, [, value]) => sum + value, 0);
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

  return (
    <div className="workspace-grid min-vh-100 text-[var(--ink)]">
      <div className="container-fluid px-0">
        <div className="row g-0 min-vh-100">
          <aside className="report-sidebar col-12 col-lg-3 col-xxl-2 p-3 p-xl-4">
            <div className="mb-4">
              <p className="eyebrow mb-1">Clinical Placements Northwest</p>
              <h1 className="h4 mb-1 fw-bold text-white">Grid Reports</h1>
              <p className="mb-0 text-white-50">{scopeLabel}</p>
            </div>

            <section className="nav-card card mb-3">
              <div className="card-body p-2">
                <h2 className="h6 text-center fw-bold mb-2">Navigation Menu</h2>
                <div className="d-grid gap-2">
                  {REPORT_PAGES.map(page => (
                    <button
                      key={page.id}
                      className={`report-nav btn ${activePage === page.id ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActivePage(page.id)}
                    >
                      {page.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

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

            <button className="btn btn-light fw-bold w-100 mb-3" type="button" onClick={clearFilters}>
              Reset filters
            </button>

            <p className="status mb-0">
              {activeAcademicYear}: {filteredFacilities.length} displayed facilities from {sourceCount} source workbooks.
            </p>
          </aside>

          <main className="col-12 col-lg-9 col-xxl-10 p-3 p-md-4">
            <section className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-start mb-3">
              <div>
                <p className="eyebrow mb-1 text-[var(--teal)]">{activeAcademicYear}</p>
                <h2 className="display-6 fw-bold mb-1 panel-title">
                  {REPORT_PAGES.find(page => page.id === activePage)?.label}
                </h2>
                <p className="selected-facility-label mb-0">{scopeLabel}</p>
              </div>
              <div className="view-tabs btn-group p-1" role="tablist" aria-label="Dashboard pages">
                {REPORT_PAGES.slice(0, 3).map(page => (
                  <button
                    key={page.id}
                    className={`btn ${activePage === page.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActivePage(page.id)}
                  >
                    {page.label.replace('Regional ', '').replace(' Comparison', '')}
                  </button>
                ))}
              </div>
            </section>

            <section className="row g-3 mb-3" aria-label="Summary metrics">
              <div className="col-6 col-xl">
                <KPICard title="Facilities" value={filteredFacilities.length} subtitle={`${totalFacilities} in year`} color="blue" />
              </div>
              <div className="col-6 col-xl">
                <KPICard title="Placements" value={data.total} subtitle={scopeLabel} color="green" />
              </div>
              <div className="col-6 col-xl">
                <KPICard title="Average" value={averagePlacements} subtitle="Per facility" color="indigo" />
              </div>
              <div className="col-6 col-xl">
                <KPICard title="Winter" value={getQuarterTotal(data, 'Winter')} subtitle="Quarter capacity" color="purple" />
              </div>
              <div className="col-12 col-xl">
                <KPICard title="Spring" value={getQuarterTotal(data, 'Spring')} subtitle="Quarter capacity" color="orange" />
              </div>
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
              <th className="text-end">Quarter Starts</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map(facility => (
              <tr key={`${facility.region}-${facility.name}`}>
                <td className="fw-semibold">{facility.name}</td>
                <td>{facility.region}</td>
                <td className="text-end fw-semibold">{facility.placements.total.toLocaleString()}</td>
                <td className="text-end">{sumValues(facility.placements.byQuarter).toLocaleString()}</td>
              </tr>
            ))}
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
