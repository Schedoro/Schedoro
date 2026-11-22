import { useLocalSearchParams } from 'expo-router';

import JobForm from '@/components/job-form';
import JobNotFound, { JobLoading } from '@/components/job-not-found';
import { useJobs } from '@/context/jobs';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { jobs, status, error } = useJobs();
  const job = jobs.find((item) => item.id === id);
  if (job) return <JobForm key={job.id} job={job} />;
  if (status === 'loading') return <JobLoading />;
  if (status === 'error') return <JobNotFound title="Couldn’t load jobs" message={error} />;
  return <JobNotFound />;
}
