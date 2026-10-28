import { useLocalSearchParams } from 'expo-router';

import JobForm from '@/components/job-form';
import JobNotFound from '@/components/job-not-found';
import { useJobs } from '@/context/jobs';

export default function EditJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { jobs } = useJobs();
  const job = jobs.find((item) => item.id === id);
  return job ? <JobForm key={job.id} job={job} /> : <JobNotFound />;
}
