// filepath: src/hooks/useCPNWData.js
import { useQuery } from '@tanstack/react-query';
import { 
  fetchAllFacilityData, 
  aggregateData, 
  getRegions, 
  getFacilitiesByRegion 
} from '../services/dataService';

export function useCPNWData(academicYear = null, region = null, facility = null) {
  const { 
    data: datasets = { academicYears: [], datasets: {} }, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['cpnw-datasets'],
    queryFn: fetchAllFacilityData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

  const academicYears = datasets.academicYears || [];
  const selectedAcademicYear = academicYear || academicYears[academicYears.length - 1] || '';
  const selectedDataset = datasets.datasets?.[selectedAcademicYear] || {};
  const facilities = selectedDataset.facilities || [];
  const aggregated = aggregateData(facilities, region, facility);

  const regions = getRegions(facilities);
  const regionFacilities = region 
    ? getFacilitiesByRegion(facilities, region)
    : [];

  return {
    facilities,
    datasets,
    academicYears,
    selectedAcademicYear,
    selectedDataset,
    aggregated,
    isLoading,
    error,
    regions,
    regionFacilities,
    refetch,
    totalFacilities: facilities.length,
    totalPlacements: aggregated.total,
  };
}
