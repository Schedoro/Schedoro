import { useCallback } from 'react';
 
import { useTeams } from '@/context/teams';
import { useApi } from '@/lib/api';
 
// shapes from backend/models.py
export type AppointmentStatus = 'Pending' | 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';
 
export type AppointmentInput = {
  jobId: string;
  assigneeIds: string[];
  start: string; // "2026-11-23T10:00:00", team local time
  end: string;
  notes: string;
};
 
export type Appointment = AppointmentInput & { appointmentId: string; teamId: string; status: AppointmentStatus };
 
/** Calls the team's backend route and returns the JSON body, or throws an Error with a readable message. */
export function useTeamRequest() {
  const api = useApi();
  const { selectedTeam } = useTeams();
  const teamId = selectedTeam?.id;
 
  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      if (!teamId) throw new Error('Pick a team first.');
      let res: Response;
      try {
        res = await api(`/teams/${encodeURIComponent(teamId)}${path}`, init);
      } catch {
        throw new Error('Can’t reach the Schedoro server. Check your connection and try again.');
      }
      if (res.ok) return res.json();
      if (res.status === 401) throw new Error('The server couldn’t verify your sign-in. Try signing out and back in.');
      let message = `Something went wrong on the server (error ${res.status}).`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') message = body.detail;
        else if (res.status === 422) message = 'Some of the details aren’t valid. Check the form and try again.';
      } catch {
        // not json, keep the message above
      }
      throw new Error(message);
    },
    [api, teamId],
  );
}
 
/** AppointmentApi from the Manual Scheduling design. */
export function useAppointmentApi() {
  const request = useTeamRequest();
 
  const createAppointment = useCallback(
    (data: AppointmentInput) =>
      request<Appointment>('/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    [request],
  );
 
  // date is "YYYY-MM-DD"
  const getAppointments = useCallback(
    (date: string) => request<Appointment[]>(`/appointments?date=${date}`),
    [request],
  );
 
  const getAppointment = useCallback(
    (id: string) => request<Appointment>(`/appointments/${encodeURIComponent(id)}`),
    [request],
  );
 
  return { createAppointment, getAppointments, getAppointment };
}
 
// ---- date helpers ----
 
const pad = (n: number) => String(n).padStart(2, '0');
 
/** Date -> "YYYY-MM-DD" in local time */
export function toDateString(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
 
/** "2026-11-23T14:30:00" -> "02:30 PM" */
export function formatTime(iso: string) {
  const [h, m] = iso.slice(11, 16).split(':').map(Number);
  return `${pad(h % 12 || 12)}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
}
 
/** minutes between two local ISO times -> "4h", "15m", "2h 30m" */
export function formatDuration(start: string, end: string) {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h}h` : '', m ? `${m}m` : ''].filter(Boolean).join(' ') || '0m';
}
 
/** "2026-11-23T10:00:00" -> "Monday, Nov 23, 2026" */
export function formatDate(iso: string) {
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });
}
 