import { Stack } from 'expo-router';

import { ScheduleSelectionProvider } from '@/context/schedule-selection';

export const unstable_settings = { anchor: 'index' };

// the provider keeps the picked jobs and workers while moving between Generate Schedule and Select Jobs
export default function ScheduleLayout() {
  return (
    <ScheduleSelectionProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ScheduleSelectionProvider>
  );
}
