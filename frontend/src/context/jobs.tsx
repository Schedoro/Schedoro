import { createContext, type ReactNode, useContext, useState } from 'react';

export type Job = {
  id: string;
  title: string;
  duration: string;
  category: string;
  description: string;
  skills: string[];
  location: string;
  availability: string[];
};

export const jobTemplates = [
  { title: 'Clean David’s House', duration: '4h', category: 'Regular cleaning' },
  { title: 'Clean Robert’s House', duration: '3h', category: 'Regular cleaning' },
  { title: 'Clean Amy’s Apartment', duration: '2h', category: 'Regular cleaning' },
  { title: 'Clean Joe’s Office', duration: '6h', category: 'Deep Cleaning' },
];

const initialJobs: Job[] = jobTemplates.map((job, index) => ({
  ...job, id: `sample-${index}`, description: '', skills: [job.category], location: '', availability: [],
  ...(index === 3 && {
    description: 'Routine cleaning of Joe’s office space in an enterprise contract for 16 months.',
    skills: ['Regular cleaning', 'Deep cleaning', 'English speaking'],
    location: '195 Hurontario Rd., Mississauga, Ontario, Canada',
    availability: ['Saturday 8am-10pm', 'Sunday 8am-10pm'],
  }),
}));

const JobsContext = createContext<{
  jobs: Job[];
  addJob: (job: Omit<Job, 'id'>) => void;
  updateJob: (id: string, job: Omit<Job, 'id'>) => void;
  deleteJob: (id: string) => void;
} | null>(null);

export function JobsProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState(initialJobs);

  function addJob(job: Omit<Job, 'id'>) {
    setJobs((current) => [{ ...job, id: `job-${Date.now()}-${Math.random().toString(36).slice(2)}` }, ...current]);
  }

  function updateJob(id: string, job: Omit<Job, 'id'>) {
    setJobs((current) => current.map((item) => item.id === id ? { ...job, id } : item));
  }

  function deleteJob(id: string) {
    setJobs((current) => current.filter((job) => job.id !== id));
  }

  return <JobsContext.Provider value={{ jobs, addJob, updateJob, deleteJob }}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const context = useContext(JobsContext);
  if (!context) throw new Error('useJobs must be used within JobsProvider');
  return context;
}
