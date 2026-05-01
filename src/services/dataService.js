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

function normalizeEducationalFacility(name) {
  const normalizedName = String(name || '').trim().replace(/\s+/g, ' ');

  if (/^su$/i.test(normalizedName)) {
    return 'Seattle University';
  }

  if (/^seattle\s+central(\s+college)?$/i.test(normalizedName)) {
    return 'Seattle Central';
  }

  if (/^seattle\s+(central|colleges?)\s*-\s*n$/i.test(normalizedName)) {
    return 'Seattle Central North';
  }

  if (/^seattle\s+(central|colleges?)\s*-\s*s$/i.test(normalizedName)) {
    return 'Seattle Central South';
  }

  if (/^sc\s*-\s*south$/i.test(normalizedName)) {
    return 'Seattle Central South';
  }

  if (/^seattle\s+(central|colleges?)\s*-\s*c$/i.test(normalizedName)) {
    return 'Seattle Central';
  }

  return normalizedName;
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
  const nursingProgramCol = findColumn('nursing program');
  const healthcareFacilityCol = findColumn('healthcare facility');
  const preceptorHoursCol = findColumn('prec. hours', 'preceptor hours');
  const totalPreceptorHoursCol = findColumn('total prec hours', 'total preceptor hours');
  const totalPlacementsCol = findColumn('total placements');
  const quarterCols = [
    ['Fall', findColumn('# of fall start dates')],
    ['Winter', findColumn('# of winter start dates')],
    ['Spring', findColumn('# of spring start dates')],
    ['Summer', findColumn('# of summer start dates')],
  ];
  
  const createPlacementBucket = () => ({
    total: 0,
    byShift: {},
    byStudentType: {},
    byProgress: {},
    byQuarter: {},
    byHealthcareFacility: {},
    byEducationalFacility: {},
    byProgramType: {},
    byStudentTypeQuarter: {},
  });

  const placements = createPlacementBucket();
  const segments = {
    inclusive: placements,
    preceptor: createPlacementBucket(),
    nonPreceptor: createPlacementBucket(),
  };

  const addRowToBucket = (bucket, row, rowPlacements, placementsPerRotation) => {
    bucket.total += rowPlacements;
    addCount(bucket.byShift, row[shiftCol], rowPlacements);
    addCount(bucket.byStudentType, row[studentTypeCol], rowPlacements);
    addCount(bucket.byProgramType, row[studentTypeCol], rowPlacements);
    addCount(bucket.byProgress, row[progressCol], rowPlacements);
    addCount(bucket.byHealthcareFacility, row[healthcareFacilityCol] || facilityName, rowPlacements);
    addCount(bucket.byEducationalFacility, normalizeEducationalFacility(row[nursingProgramCol]), rowPlacements);

    const studentType = String(row[studentTypeCol] || '').trim();
    if (studentType) {
      bucket.byStudentTypeQuarter[studentType] ||= { total: 0, Fall: 0, Winter: 0, Spring: 0, Summer: 0 };
      bucket.byStudentTypeQuarter[studentType].total += rowPlacements;
    }

    quarterCols.forEach(([quarter, col]) => {
      if (col >= 0) {
        const quarterTotal = toCount(row[col]) * placementsPerRotation;
        addCount(bucket.byQuarter, quarter, quarterTotal);
        if (studentType) {
          bucket.byStudentTypeQuarter[studentType][quarter] += quarterTotal;
        }
      }
    });
  };
  
  rows.forEach(row => {
    const rowPlacements = toCount(row[totalPlacementsCol]) || 1;
    const placementsPerRotation = toCount(row[placementsPerRotationCol]) || rowPlacements;
    const preceptorHours = toCount(row[preceptorHoursCol]) + toCount(row[totalPreceptorHoursCol]);
    const segmentKey = preceptorHours > 0 ? 'preceptor' : 'nonPreceptor';

    addRowToBucket(segments.inclusive, row, rowPlacements, placementsPerRotation);
    addRowToBucket(segments[segmentKey], row, rowPlacements, placementsPerRotation);
  });
  
  return {
    name: facilityName,
    region,
    url,
    placements,
    segments,
  };
}

/**
 * Get aggregated data for all facilities or by region
 */
export function aggregateData(facilities, region = null, facility = null, segment = 'inclusive') {
  let filtered = facilities;
  
  if (region) {
    filtered = filtered.filter(f => f.region === region);
  }
  
  if (facility) {
    filtered = filtered.filter(f => f.name === facility);
  }
  
  const aggregated = {
    total: 0,
    byShift: {},
    byStudentType: {},
    byProgress: {},
    byQuarter: {},
    byHealthcareFacility: {},
    byEducationalFacility: {},
    byProgramType: {},
    byStudentTypeQuarter: {},
    facilities: filtered.map(f => f.name)
  };
  
  filtered.forEach(f => {
    const placementSource = f.segments?.[segment] || f.placements;

    aggregated.total += placementSource.total;

    Object.entries(aggregated)
      .filter(([key, value]) => key.startsWith('by') && typeof value === 'object')
      .forEach(([key, target]) => {
        if (key === 'byStudentTypeQuarter') {
          Object.entries(placementSource.byStudentTypeQuarter || {}).forEach(([studentType, quarters]) => {
            target[studentType] ||= { total: 0, Fall: 0, Winter: 0, Spring: 0, Summer: 0 };
            Object.entries(quarters).forEach(([quarter, val]) => {
              target[studentType][quarter] = (target[studentType][quarter] || 0) + val;
            });
          });
          return;
        }

        Object.entries(placementSource[key] || {}).forEach(([entryKey, val]) => {
          target[entryKey] = (target[entryKey] || 0) + val;
        });
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
