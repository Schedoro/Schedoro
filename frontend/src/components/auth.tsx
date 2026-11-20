import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text, TextInput } from '@/components/typography';
import { Fonts } from '@/constants/fonts';

const RESEND_COOLDOWN_SECONDS = 30;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CONNECTION_ERROR = 'Something went wrong. Check your connection and try again.';

// Clerk API errors wrap a generic code (e.g. "api_response_error") around specific ones
// (e.g. "form_identifier_not_found") in `errors`, so check the specific code first.
export function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const { code, errors } = error as { code?: unknown; errors?: { code?: unknown }[] };
  const first = errors?.[0]?.code;
  if (typeof first === 'string') return first;
  return typeof code === 'string' ? code : undefined;
}

// Clerk's own human-readable explanation, e.g. for password rules.
export function errorText(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const first = (error as { errors?: { longMessage?: unknown; message?: unknown }[] }).errors?.[0];
  const text = first?.longMessage ?? first?.message;
  return typeof text === 'string' ? text : undefined;
}

// Shows Clerk's real error in the Metro terminal while developing.
export function logClerkError(label: string, error: unknown) {
  if (__DEV__) console.warn(`Clerk ${label} failed:`, JSON.stringify(error, null, 2));
}

export function codeErrorMessage(error: unknown) {
  switch (errorCode(error)) {
    case 'form_code_incorrect':
      return 'That code is incorrect. Check it and try again.';
    case 'verification_expired':
      return 'That code has expired. Tap “Resend code” for a new one.';
    case 'verification_failed':
    case 'too_many_requests':
      return 'Too many attempts. Tap “Resend code” for a new one.';
    default:
      return 'We couldn’t verify that code. Please try again.';
  }
}

export function sendErrorMessage(error: unknown) {
  return errorCode(error) === 'too_many_requests'
    ? 'Too many requests. Wait a minute and try again.'
    : 'We couldn’t send a code. Check your connection and try again.';
}

function maskEmail(email: string) {
  const [name, domain] = email.trim().split('@');
  if (!domain) return name ? `${name.charAt(0)}***` : 'a***@g***.com';
  const tld = domain.includes('.') ? domain.slice(domain.lastIndexOf('.')) : '';
  return `${name.charAt(0)}***@${domain.charAt(0)}***${tld}`;
}

export function GoogleIcon() {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 48 48"
      {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessibilityElementsHidden: true })}>
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32.1 14l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32.1 14l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
    </Svg>
  );
}

/** The shared login / sign-up backdrop: logo artwork, keyboard handling, and the Schedoro letter logo. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const artworkWidth = Math.min(343, width - 40);
  const artworkHeight = artworkWidth * (474 / 343);

  return (
    <View style={authStyles.screen}>
      <Image
        source={require('@/assets/images/logos/SchedoroLogoArtwork.svg')}
        tintColor="rgba(94, 94, 253, 0.10)"
        pointerEvents="none"
        accessible={false}
        style={[
          authStyles.artwork,
          { width: artworkWidth, height: artworkHeight, bottom: -(artworkHeight * 2) / 3 + 5 },
        ]}
      />
      <SafeAreaView style={authStyles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={authStyles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[
              authStyles.content,
              { paddingBottom: artworkHeight / 3 + 5 + 60 - insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={authStyles.form}>
              <Image
                source={require('@/assets/images/logos/SchedoroLogoLetterLight.svg')}
                contentFit="contain"
                accessibilityLabel="Schedoro"
                style={authStyles.logo}
              />
              {children}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/**
 * The "Check your Email!" step. `onVerify` and `onResend` return an error message, or null on success.
 * The resend cooldown starts immediately, because the first code was just sent.
 */
export function PasscodeStep({
  email,
  onVerify,
  onResend,
  onBack,
}: {
  email: string;
  onVerify: (code: string) => Promise<string | null>;
  onResend: () => Promise<string | null>;
  onBack: () => void;
}) {
  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function verify() {
    if (busy) return;
    Keyboard.dismiss();
    if (passcode.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError('');
    const message = await onVerify(passcode);
    // On success the root layout's guard swaps this screen out, so only clear `busy` on failure.
    if (message) {
      setBusy(false);
      setError(message);
    }
  }

  async function resend() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError('');
    setResent(false);
    setPasscode('');
    const message = await onResend();
    setBusy(false);
    if (message) {
      setError(message);
    } else {
      setResent(true);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    }
  }

  return (
    <>
      <Text accessibilityRole="header" style={[authStyles.title, styles.passcodeTitle]}>Check your Email!</Text>
      <Text style={styles.passcodeDescription}>
        We’ve sent you a passcode.{'\n'}
        Please check your inbox at {maskEmail(email)}.
      </Text>
      <TextInput
        accessibilityLabel="6-digit passcode"
        placeholder="Enter 6-digit code"
        placeholderTextColor="#999999"
        value={passcode}
        onChangeText={(value) => { setPasscode(value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        returnKeyType="done"
        onSubmitEditing={verify}
        style={[authStyles.input, error && authStyles.invalid]}
      />
      {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}
      <PrimaryButton label="Continue" busy={busy} onPress={verify} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || cooldown > 0 }}
        disabled={busy || cooldown > 0}
        onPress={resend}
        style={({ pressed }) => [styles.resendButton, pressed && authStyles.pressed]}>
        <Text style={[styles.resendLabel, cooldown === 0 && authStyles.underlined]}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Text>
      </Pressable>
      {resent && <Text accessibilityLiveRegion="polite" style={styles.resendStatus}>Code resent</Text>}
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.changeEmailButton, pressed && authStyles.pressed]}>
        <Text style={[styles.resendLabel, authStyles.underlined]}>Use a different email</Text>
      </Pressable>
    </>
  );
}

export function PrimaryButton({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [authStyles.primaryButton, (pressed || busy) && authStyles.pressed]}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={authStyles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

export function GoogleButton({ disabled, onPress }: { disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [authStyles.googleButton, pressed && authStyles.pressed]}>
      <GoogleIcon />
      <Text style={authStyles.googleLabel}>Continue with Google</Text>
    </Pressable>
  );
}

export const authStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  safeArea: { flex: 1 },
  artwork: { position: 'absolute', alignSelf: 'center' },
  logo: { width: 52, height: 72, alignSelf: 'center', marginBottom: 20 },
  content: { flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 28, paddingTop: 40 },
  form: { width: '100%', maxWidth: 390 },
  title: { fontSize: 30, fontFamily: Fonts.bold, color: '#000000', textAlign: 'center', marginBottom: 26, letterSpacing: -0.8 },
  googleButton: { display: 'flex', width: 317, maxWidth: '100%', height: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, alignSelf: 'center', borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 30 },
  googleLabel: { fontSize: 18, color: '#505050', textAlign: 'center' },
  divider: { textAlign: 'center', color: '#999999', fontSize: 18, marginVertical: 28 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: '#171717' },
  primaryButton: { display: 'flex', height: 44, marginTop: 24, paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', gap: 8, alignSelf: 'stretch', borderRadius: 8, backgroundColor: '#171717' },
  primaryLabel: { color: '#FFFFFF', fontSize: 19 },
  pressed: { opacity: 0.7 },
  terms: { marginTop: 24, color: '#969696', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  switchPrompt: { marginTop: 20, color: '#969696', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  invalid: { borderColor: '#C93838' },
  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C93838', marginTop: 6 },
  underlined: { textDecorationLine: 'underline' },
});

const styles = StyleSheet.create({
  passcodeTitle: { marginBottom: 48 },
  passcodeDescription: { color: '#999999', fontSize: 18, lineHeight: 28, textAlign: 'center', marginBottom: 28 },
  resendButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 36, paddingHorizontal: 16 },
  resendLabel: { fontFamily: Fonts.regular, color: '#999999', fontSize: 16 },
  resendStatus: { fontFamily: Fonts.regular, color: '#999999', textAlign: 'center', fontSize: 13, marginTop: 4 },
  changeEmailButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 4, paddingHorizontal: 16 },
});
