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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const router = useRouter();

  function logIn() {
    Keyboard.dismiss();
    router.replace('/schedule');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.title}>Welcome Back!</Text>

            <Pressable
              accessibilityRole="button"
              onPress={logIn}
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed]}>
              <View style={styles.googleIcon}><GoogleIcon /></View>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  form: { width: '100%', maxWidth: 390 },
  title: { fontSize: 30, fontWeight: '700', color: '#000000', textAlign: 'center', marginBottom: 26, letterSpacing: -0.8 },
  googleButton: { minHeight: 56, borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 30, justifyContent: 'center', paddingHorizontal: 48, paddingVertical: 12 },
  googleIcon: { position: 'absolute', left: 20 },
  googleLabel: { fontSize: 18, color: '#505050', textAlign: 'center' },
  divider: { textAlign: 'center', color: '#999999', fontSize: 18, marginVertical: 28 },
  input: { minHeight: 50, borderWidth: 1, borderColor: '#E1E1E1', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: '#171717' },
  loginButton: { minHeight: 54, marginTop: 24, borderRadius: 10, backgroundColor: '#171716', alignItems: 'center', justifyContent: 'center', padding: 12 },
  loginLabel: { color: '#FFFFFF', fontSize: 19 },
  pressed: { opacity: 0.7 },
  terms: { marginTop: 24, color: '#969696', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  signup: { marginTop: 20, color: '#969696', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  underlined: { textDecorationLine: 'underline' },
});
