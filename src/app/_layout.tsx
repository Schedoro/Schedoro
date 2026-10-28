import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Fonts, productSansFonts } from '@/constants/fonts';
import { ProfileProvider } from '@/context/profile';
import { TeamsProvider } from '@/context/teams';

void SplashScreen.preventAutoHideAsync();

const navigationFonts = {
  regular: { fontFamily: Fonts.regular, fontWeight: 'normal' },
  medium: { fontFamily: Fonts.medium, fontWeight: 'normal' },
  bold: { fontFamily: Fonts.bold, fontWeight: 'normal' },
  heavy: { fontFamily: Fonts.black, fontWeight: 'normal' },
} as const;

const lightTheme = { ...DefaultTheme, fonts: navigationFonts };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(productSansFonts);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
    if (fontError) {
      console.error('Failed to load Product Sans fonts:', fontError);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider value={lightTheme}>
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
