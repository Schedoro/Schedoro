import AppTabs from '@/components/app-tabs';
import { JobsProvider } from '@/context/jobs';
import { MembersProvider } from '@/context/members';

// one shared copy of the team's jobs and members for every tab,
// so a job made in Jobs shows up in Schedule right away
export default function TabsLayout() {
  return (
    <JobsProvider>
      <MembersProvider>
        <AppTabs />
      </MembersProvider>
    </JobsProvider>
  );
}
