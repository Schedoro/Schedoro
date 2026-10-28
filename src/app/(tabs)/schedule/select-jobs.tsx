import { jobs } from '@/components/schedule/schedule-data';
import { SelectList } from '@/components/schedule/select-list';

export default function SelectJobsScreen() {
  return <SelectList title="Select Jobs" unit="jobs" searchPlaceholder="Search jobs..." items={jobs} />;
}
