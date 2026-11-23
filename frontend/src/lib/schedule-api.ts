import { useCallback } from 'react';

import { useTeamRequest } from '@/lib/appointment-api';

// shapes are from backend/schedule.py
export type ProposedAppointment = {
  jobId: string;
  assigneeIds: string[]; // memberIds
  start: string; // team local time, no offset
  end: string;
  source: 'ai' | 'basic'; // gemini, or the basic scheduler when gemini's pick broke a rule
};

export type UnscheduledJob = { jobId: string; reason: string };

export type ProposalResult = {
  weekStart: string;
  proposals: ProposedAppointment[];
  unscheduled: UnscheduledJob[];
  notice: string | null;
};

// AISchedulingApi: asks the backend for a proposed week. The backend loads the team's jobs and members itself
export function useScheduleApi() {
  const request = useTeamRequest();

  const proposeSchedule = useCallback(
    (weekStart: string, jobIds?: string[], memberIds?: string[], notes = '') =>
      request<ProposalResult>('/schedule/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, jobIds, memberIds, notes }),
      }),
    [request],
  );

  return { proposeSchedule };
}
