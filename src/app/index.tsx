import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

function GoogleIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 32.1 14l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
      <Path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32.1 14l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
      <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44Z" />
      <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2A20 20 0 0 0 44 24c0-1.2-.1-2.4-.4-3.5Z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'email' | 'passcode'>('email');
  const [passcode, setPasscode] = useState('');
  const [resent, setResent] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const artworkWidth = Math.min(343, width - 40);
  const artworkHeight = artworkWidth * (474 / 343);

  function logIn() {
    Keyboard.dismiss();
    setStep('passcode');
  }

  function continueToApp() {
    Keyboard.dismiss();
    router.replace('/teams');
  }

  const [emailName, emailDomain] = username.trim().split('@');
  const maskedEmail = emailDomain
    ? `${emailName.charAt(0)}***@${emailDomain.charAt(0)}***${emailDomain.includes('.') ? emailDomain.slice(emailDomain.lastIndexOf('.')) : ''}`
    : emailName ? `${emailName.charAt(0)}***` : 'a***@g***.com';

  return (
    <View style={styles.screen}>
      <Image
        source={require('@/assets/images/logos/SchedoroLogoArtwork.svg')}
        tintColor="rgba(94, 94, 253, 0.10)"
        pointerEvents="none"
        accessible={false}
        style={[
          styles.artwork,
          { width: artworkWidth, height: artworkHeight, bottom: -(artworkHeight * 2) / 3 + 5 },
        ]}
      />
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          style={styles.safeArea}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: artworkHeight / 3 + 5 + 60 - insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <View style={styles.form}>
              <Image
                source={require('@/assets/images/logos/SchedoroLogoLetterLight.svg')}
                contentFit="contain"
                accessibilityLabel="Schedoro"
                style={styles.logo}
              />
              {step === 'passcode' ? (
                <>
                  <Text accessibilityRole="header" style={[styles.title, styles.passcodeTitle]}>Check your Email!</Text>
                  <Text style={styles.passcodeDescription}>
                    We’ve sent you a passcode.{'\n'}
                    Please check your inbox at {maskedEmail}.
                  </Text>
                  <TextInput
                    accessibilityLabel="6-digit passcode"
                    placeholder="Enter 6-digit code"
                    placeholderTextColor="#999999"
                    value={passcode}
                    onChangeText={(value) => setPasscode(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={continueToApp}
                    style={styles.input}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={continueToApp}
                    style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
                    <Text style={styles.loginLabel}>Continue</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => { setPasscode(''); setResent(true); }}
                    style={({ pressed }) => [styles.resendButton, pressed && styles.pressed]}>
                    <Text style={[styles.resendLabel, styles.underlined]}>Resend code</Text>
                  </Pressable>
                  {resent && <Text accessibilityLiveRegion="polite" style={styles.resendStatus}>Code resent</Text>}
                </>
              ) : (
                <>
                  <Text accessibilityRole="header" style={styles.title}>Welcome Back!</Text>

                  <Pressable
                    accessibilityRole="button"
                    onPress={continueToApp}
                    style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
                    <GoogleIcon />
                    <Text style={styles.googleLabel}>Continue with Google</Text>
                  </Pressable>

                  <Text style={styles.divider}>or</Text>

                  <TextInput
                    accessibilityLabel="Email or username"
                    placeholder="Enter email or username"
                    placeholderTextColor="#999999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="username"
                    textContentType="username"
                    returnKeyType="go"
                    onSubmitEditing={logIn}
                    style={styles.input}
                  />

                  <Pressable
                    accessibilityRole="button"
                    onPress={logIn}
                    style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
                    <Text style={styles.loginLabel}>Log in</Text>
                  </Pressable>

                  <Text style={styles.terms}>
                    By continuing, you agree to our <Text style={styles.underlined}>Terms</Text> and{' '}
                    <Text style={styles.underlined}>Privacy Policy</Text>
                  </Text>
                  <Text style={styles.signup}>
                    Don’t have an account? <Text style={styles.underlined}>Sign up</Text>
                  </Text>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  safeArea: { flex: 1 },
  artwork: { position: 'absolute', alignSelf: 'center' },
  logo: { width: 52, height: 72, alignSelf: 'center', marginBottom: 20 },
  content: { flexGrow: 1, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 28, paddingTop: 40 },
  form: { width: '100%', maxWidth: 390 },
  title: { fontSize: 30, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 26, letterSpacing: -0.8 },
  googleButton: { display: 'flex', width: 317, maxWidth: '100%', height: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, alignSelf: 'center', borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 30 },
  googleLabel: { fontSize: 18, color: '#505050', textAlign: 'center' },
  divider: { textAlign: 'center', color: '#999999', fontSize: 18, marginVertical: 28 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: '#171717' },
  loginButton: { display: 'flex', height: 44, marginTop: 24, paddingVertical: 8, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', gap: 8, alignSelf: 'stretch', borderRadius: 8, backgroundColor: '#171717' },
  loginLabel: { color: '#FFFFFF', fontSize: 19 },
  pressed: { opacity: 0.7 },
  terms: { marginTop: 24, color: '#969696', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  signup: { marginTop: 20, color: '#969696', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  passcodeTitle: { marginBottom: 48 },
  passcodeDescription: { color: '#999999', fontSize: 18, lineHeight: 28, textAlign: 'center', marginBottom: 28 },
  resendButton: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', marginTop: 36, paddingHorizontal: 16 },
  resendLabel: { color: '#999999', fontSize: 16 },
  resendStatus: { color: '#999999', textAlign: 'center', fontSize: 13, marginTop: 4 },
  underlined: { textDecorationLine: 'underline' },
});
