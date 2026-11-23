import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { type WorkHours, windowsFromApi, windowsToApi } from '@/context/members';
import { useTeams } from '@/context/teams';
import { ApiError, type ApiLocation, type ApiWindow, errorMessage, jsonHeaders, useTeamApi } from '@/lib/api';

export { errorMessage };

export type Job = {
  id: string;
  title: string;
  duration: string;
  category: string;
  description: string;
  skills: string[];
  location: string;
  availability: WorkHours[];
};

export type JobInput = Omit<Job, 'id' | 'category'>;

// presets for the job name picker, not saved jobs
export const jobTemplates = [
  { title: 'Clean David’s House', duration: '4h', category: 'Regular cleaning' },
  { title: 'Clean Robert’s House', duration: '3h', category: 'Regular cleaning' },
  { title: 'Clean Amy’s Apartment', duration: '2h', category: 'Regular cleaning' },
  { title: 'Clean Joe’s Office', duration: '6h', category: 'Deep Cleaning' },
];

// shapes from backend/models.py
type ApiJobIn = {
  name: string;
  description: string;
  location: ApiLocation | null;
  estimatedDurationMinutes: number;
  requiredSkills: string[];
  availability: ApiWindow[];
};
type ApiJob = ApiJobIn & { jobId: string; teamId: string };

// "30 min" -> 30, "1.5h" -> 90
export function durationToMinutes(value: string) {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*(h|min)$/);
  if (!match) return null;
  return Math.round(Number(match[1]) * (match[2] === 'h' ? 60 : 1));
}

function minutesToDuration(minutes: number) {
  return minutes < 60 ? `${minutes} min` : `${+(minutes / 60).toFixed(2)}h`;
}

function fromApi(job: ApiJob): Job {
  return {
    id: job.jobId,
    title: job.name,
    duration: minutesToDuration(job.estimatedDurationMinutes),
    category: job.requiredSkills.join(', '),
    description: job.description,
    skills: job.requiredSkills,
    location: job.location?.address ?? '',
    availability: windowsFromApi(job.availability),
  };
}

function toApi(job: JobInput, previous?: ApiJob): ApiJobIn {
  const address = job.location.trim();
  return {
    name: job.title,
    description: job.description,
    // keep lat/long/placeId if the address didn't change
    location: !address ? null : previous?.location && previous.location.address === address ? previous.location : { address },
    estimatedDurationMinutes: durationToMinutes(job.duration) ?? 0,
    requiredSkills: job.skills,
    availability: windowsToApi(job.availability),
  };
}


type JobsStatus = 'loading' | 'ready' | 'error';

const JobsContext = createContext<{
  jobs: Job[];
  status: JobsStatus;
  error: string | null;
  refresh: () => Promise<void>;
  addJob: (job: JobInput) => Promise<Job>;
  updateJob: (id: string, job: JobInput) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
} | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const { selectedTeam } = useTeams();
  const request = useTeamApi(selectedTeam?.id, 'jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<JobsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  // raw jobs from the api, so an edit doesn't wipe fields the app doesn't show (like lat/long)
  const apiJobs = useRef(new Map<string, ApiJob>());

  const remember = useCallback((job: ApiJob) => {
    apiJobs.current.set(job.jobId, job);
    return fromApi(job);
  }, []);

  const fetchJobs = useCallback(async (): Promise<ApiJob[]> => (await request('')).json(), [request]);

  const showJobs = useCallback((list: ApiJob[]) => {
    apiJobs.current.clear();
    setJobs(list.map(remember));
    setError(null);
    setStatus('ready');
  }, [remember]);

  const showError = useCallback((e: unknown) => {
    setError(errorMessage(e));
    // if a refresh fails, keep showing the jobs we already have
    setStatus((current) => current === 'ready' ? 'ready' : 'error');
  }, []);

  const refresh = useCallback(() => fetchJobs().then(showJobs, showError), [fetchJobs, showJobs, showError]);

  useEffect(() => {
    let stale = false; // ignore the response if the team changed while it was loading
    fetchJobs().then(
      (list) => { if (!stale) showJobs(list); },
      (e) => { if (!stale) showError(e); },
    );
    return () => { stale = true; };
  }, [fetchJobs, showJobs, showError]);

  const addJob = useCallback(async (job: JobInput) => {
    const res = await request('', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(toApi(job)) });
    const created = remember(await res.json());
    setJobs((current) => [created, ...current]);
    return created;
  }, [request, remember]);

  const updateJob = useCallback(async (id: string, job: JobInput) => {
    const body = JSON.stringify(toApi(job, apiJobs.current.get(id)));
    const res = await request(`/${encodeURIComponent(id)}`, { method: 'PUT', headers: jsonHeaders, body });
    const updated = remember(await res.json());
    setJobs((current) => current.map((item) => item.id === id ? updated : item));
    return updated;
  }, [request, remember]);

  const deleteJob = useCallback(async (id: string) => {
    try {
      await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      // 404 means it's already gone, so just drop it from the list
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    apiJobs.current.delete(id);
    setJobs((current) => current.filter((job) => job.id !== id));
  }, [request]);

  return (
    <JobsContext.Provider value={{ jobs, status, error, refresh, addJob, updateJob, deleteJob }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (!context) throw new Error('useJobs must be used within JobsProvider');
  return context;
}
