import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import * as XLSX from 'xlsx';
import {
  fetchFileUrls,
  parseFacilityData,
} from '../src/services/dataService.js';

const ACADEMIC_YEARS = ['2023-2024', '2024-2025'];
const outputPath = resolve('public/data/datasets.json');
const legacyOutputPath = resolve('public/data/facilities.json');

async function fetchAndParseExcel(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  } catch (error) {
    console.warn(`Error parsing ${url}:`, error.message);
    return null;
  }
}

async function buildYearData(academicYear) {
  const urls = await fetchFileUrls(academicYear);
  const facilities = [];
  const failures = [];

  for (const url of urls) {
    const rawData = await fetchAndParseExcel(url);
    const facility = rawData ? parseFacilityData(rawData, url) : null;

    if (facility) {
      facilities.push(facility);
    } else {
      failures.push(url);
    }
  }

  return {
    academicYear,
    generatedAt: new Date().toISOString(),
    sourceCount: urls.length,
    facilityCount: facilities.length,
    failures,
    facilities,
  };
}

async function buildFacilityData() {
  const datasets = {};

  for (const academicYear of ACADEMIC_YEARS) {
    datasets[academicYear] = await buildYearData(academicYear);
    const failures = datasets[academicYear].failures;

    console.log(`Prepared ${datasets[academicYear].facilityCount} facilities for ${academicYear}`);
    if (failures.length) {
      console.warn(`${failures.length} ${academicYear} files could not be parsed.`);
    }
  }

  const payload = {
    academicYears: ACADEMIC_YEARS,
    generatedAt: new Date().toISOString(),
    datasets,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(legacyOutputPath, `${JSON.stringify(datasets['2024-2025'], null, 2)}\n`);

  console.log(`Wrote ${ACADEMIC_YEARS.length} academic years to ${outputPath}`);
}

buildFacilityData().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
