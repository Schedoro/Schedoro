import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

export default function TeamLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FFFFFF' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[memberId]" />
    </Stack>
  );
}
