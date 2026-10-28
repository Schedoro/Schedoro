import { Stack } from 'expo-router';

import { JobsProvider } from '@/context/jobs';

export const unstable_settings = { initialRouteName: 'index' };

export default function JobsLayout() {
  return (
    <JobsProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="[id]" />
        <Stack.Screen name="edit" />
      </Stack>
    </JobsProvider>
  );
}
