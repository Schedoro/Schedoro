import { useCallback } from 'react';
 
import { useTeamRequest } from '@/lib/appointment-api';
 
// shape from backend/analytics.py
export type UtilizationMetric = {
  teamMemberId: string;
  name: string;
  scheduledHours: number;
  maxWeeklyHours: number;
  utilizationPercent: number;
};
 
/** AnalyticsApi from the Scheduling Analytics design. */
export function useAnalyticsApi() {
  const request = useTeamRequest();
 
  // start and end are "YYYY-MM-DD", both included
  const getUtilization = useCallback(
    (start: string, end: string) =>
      request<UtilizationMetric[]>(`/analytics/utilization?start=${start}&end=${end}`),
    [request],
  );
 
  return { getUtilization };
}
 