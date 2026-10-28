import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerBackVisible: false, gestureEnabled: false, animation: 'none' }}>
      <Stack.Screen name="index" options={{ title: 'More', headerShown: false }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile', headerShown: false }} />
    </Stack>
  );
}
