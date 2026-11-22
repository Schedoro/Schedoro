import { Stack } from 'expo-router';

import { MembersProvider } from '@/context/members';

export const unstable_settings = { initialRouteName: 'index' };

export default function TeamLayout() {
  return (
    <MembersProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="[memberId]" />
      </Stack>
    </MembersProvider>
  );
}
