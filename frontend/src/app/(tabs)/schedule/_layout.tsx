import { Stack } from 'expo-router';
 
import { JobsProvider } from '@/context/jobs';
 
export const unstable_settings = { anchor: 'index' };
 
// JobsProvider so the schedule screens can show job titles and locations
export default function ScheduleLayout() {
  return (
    <JobsProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </JobsProvider>
  );
}
 