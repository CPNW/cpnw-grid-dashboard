// filepath: src/services/dataService.js
const BASE_URL = 'https://cpnw.blob.core.windows.net/documents/pbiGrids';
const DATASETS_URL = `${import.meta.env?.BASE_URL ?? '/'}data/datasets.json`;

/**
 * Fetch the list of Excel file URLs from the file_urls.txt
 */
export async function fetchFileUrls(academicYear) {
  const response = await fetch(`${BASE_URL}/${academicYear}/file_urls.txt`);
  if (!response.ok) {
    throw new Error(`Failed to fetch file URLs: ${response.status}`);
  }
  
  const text = await response.text();
  const urls = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.endsWith('.xlsx'));
  
  return urls;
}

/**
 * Parse a facility name from URL
 * e.g., https://.../North/evergreenHealthRevised.xlsx -> "Evergreen Health"
 */
export function parseFacilityName(url) {
  const filename = url.split('/').pop();
  const name = filename.replace('Revised.xlsx', '');
  return formatFacilityName(name);
}

/**
 * Format facility name from camelCase to Title Case
 * e.g., "evergreenHealth" -> "Evergreen Health"
 */
function formatFacilityName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

/**
 * Extract region from URL
 */
export function parseRegion(url) {
  const parts = url.split('/');
  const regionIndex = parts.findIndex(p => p === 'East' || p === 'North' || p === 'South');
  return regionIndex >= 0 ? parts[regionIndex] : 'Unknown';
}

/**
 * Fetch the generated same-origin dataset used by the browser app.
 */
export async function fetchAllFacilityData() {
  const response = await fetch(DATASETS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch generated CPNW data: ${response.status}`);
  }

  const dataset = await response.json();
  return dataset;
}

/**
 * Parse raw Excel data into structured facility data
 * Based on Power BI columns: Shift Type, Type of Students, Progress in Program, Quarter
 */
export function parseFacilityData(rawData, url) {
  if (!rawData || rawData.length < 2) return null;
  
  const headers = rawData[0].map(h => String(h).toLowerCase().trim());
  const rows = rawData.slice(1);
  
  const facilityName = parseFacilityName(url);
  const region = parseRegion(url);
  
  const findColumn = (...names) => headers.findIndex(header => names.includes(header));
  const toCount = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const addCount = (target, key, count) => {
    const normalizedKey = String(key || '').trim();
    if (!normalizedKey || count <= 0) return;
    target[normalizedKey] = (target[normalizedKey] || 0) + count;
  };

  const placementsPerRotationCol = findColumn('# placements per rotation');
  const shiftCol = findColumn('shift type');
  const studentTypeCol = findColumn('type of students');
  const progressCol = findColumn('progress in program');
  const totalPlacementsCol = findColumn('total placements');
  const quarterCols = [
    ['Fall', findColumn('# of fall start dates')],
    ['Winter', findColumn('# of winter start dates')],
    ['Spring', findColumn('# of spring start dates')],
    ['Summer', findColumn('# of summer start dates')],
  ];
  
  // Aggregate data
  const placements = {
    total: 0,
    byShift: {},
    byStudentType: {},
    byProgress: {},
    byQuarter: {}
  };
  
  rows.forEach(row => {
    const rowPlacements = toCount(row[totalPlacementsCol]) || 1;
    const placementsPerRotation = toCount(row[placementsPerRotationCol]) || rowPlacements;

    placements.total += rowPlacements;
    addCount(placements.byShift, row[shiftCol], rowPlacements);
    addCount(placements.byStudentType, row[studentTypeCol], rowPlacements);
    addCount(placements.byProgress, row[progressCol], rowPlacements);

    quarterCols.forEach(([quarter, col]) => {
      if (col >= 0) {
        addCount(placements.byQuarter, quarter, toCount(row[col]) * placementsPerRotation);
      }
    });
  });
  
  return {
    name: facilityName,
    region,
    url,
    placements
  };
}

/**
 * Get aggregated data for all facilities or by region
 */
export function aggregateData(facilities, region = null, facility = null) {
  let filtered = facilities;
  
  if (region) {
    filtered = filtered.filter(f => f.region === region);
  }
  
  if (facility) {
    filtered = filtered.filter(f => f.name === facility);
  }
  
  // Aggregate all data
  const aggregated = {
    total: 0,
    byShift: {},
    byStudentType: {},
    byProgress: {},
    byQuarter: {},
    facilities: filtered.map(f => f.name)
  };
  
  filtered.forEach(f => {
    aggregated.total += f.placements.total;
    
    Object.entries(f.placements.byShift).forEach(([key, val]) => {
      aggregated.byShift[key] = (aggregated.byShift[key] || 0) + val;
    });
    
    Object.entries(f.placements.byStudentType).forEach(([key, val]) => {
      aggregated.byStudentType[key] = (aggregated.byStudentType[key] || 0) + val;
    });
    
    Object.entries(f.placements.byProgress).forEach(([key, val]) => {
      aggregated.byProgress[key] = (aggregated.byProgress[key] || 0) + val;
    });
    
    Object.entries(f.placements.byQuarter).forEach(([key, val]) => {
      aggregated.byQuarter[key] = (aggregated.byQuarter[key] || 0) + val;
    });
  });
  
  return aggregated;
}

/**
 * Get list of unique regions
 */
export function getRegions(facilities) {
  const regions = [...new Set(facilities.map(f => f.region))];
  return regions.sort();
}

/**
 * Get list of facilities for a given region
 */
export function getFacilitiesByRegion(facilities, region) {
  return facilities
    .filter(f => f.region === region)
    .map(f => f.name)
    .sort();
}
