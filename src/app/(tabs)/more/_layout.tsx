import { Stack } from 'expo-router';

export const unstable_settings = { initialRouteName: 'index' };

export default function MoreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'More' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
    </Stack>
  );
}
