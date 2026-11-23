import { SelectList } from '@/components/schedule/select-list';
import { useJobs } from '@/context/jobs';
import { useScheduleSelection } from '@/context/schedule-selection';

export default function SelectJobsScreen() {
  const { jobs } = useJobs();
  const { jobIds, setJobIds } = useScheduleSelection();
  const items = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    subtitle: [job.duration, job.skills.join(', ')].filter(Boolean).join(' ⋅ '),
  }));

  return (
    <SelectList
      title="Select Jobs"
      unit="jobs"
      searchPlaceholder="Search jobs..."
      items={items}
      initial={jobIds}
      onApply={setJobIds}
    />
  );
}
