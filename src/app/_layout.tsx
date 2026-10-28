import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ProfileProvider } from '@/context/profile';
import { TeamsProvider } from '@/context/teams';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ProfileProvider>
        <TeamsProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="teams" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </TeamsProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
