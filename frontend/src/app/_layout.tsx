import { ClerkProvider, useAuth } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Fonts, productSansFonts } from '@/constants/fonts';
import { ProfileProvider } from '@/context/profile';
import { TeamsProvider } from '@/context/teams';

void SplashScreen.preventAutoHideAsync();

const publishableKey = requirePublishableKey(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);

function requirePublishableKey(key: string | undefined): string {
  if (!key) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add it to frontend/.env (see frontend/.env.example).');
  }
  return key;
}

const navigationFonts = {
  regular: { fontFamily: Fonts.regular, fontWeight: 'normal' },
  medium: { fontFamily: Fonts.medium, fontWeight: 'normal' },
  bold: { fontFamily: Fonts.bold, fontWeight: 'normal' },
  heavy: { fontFamily: Fonts.black, fontWeight: 'normal' },
} as const;

const lightTheme = { ...DefaultTheme, fonts: navigationFonts };

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <RootNavigator />
    </ClerkProvider>
  );
}

function RootNavigator() {
  const [fontsLoaded, fontError] = useFonts(productSansFonts);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const ready = (fontsLoaded || !!fontError) && authLoaded;
  const signedIn = !!isSignedIn;

  useEffect(() => {
    if (ready) {
      SplashScreen.hide();
    }
    if (fontError) {
      console.error('Failed to load Product Sans fonts:', fontError);
    }
  }, [ready, fontError]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={lightTheme}>
      <ProfileProvider>
        <TeamsProvider>
          {/* Signing in or out flips these guards. Expo Router then falls back to "index",
              which redirects to /teams or /sign-in. */}
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="teams" />
              <Stack.Screen name="(tabs)" />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="sign-up" />
            </Stack.Protected>
          </Stack>
        </TeamsProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
}
