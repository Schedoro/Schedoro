import { useSignUp } from '@clerk/expo';
import { router, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { Keyboard, StyleSheet, TextInput as NativeTextInput, View } from 'react-native';

import {
  AuthLayout,
  authStyles,
  CONNECTION_ERROR,
  codeErrorMessage,
  EMAIL_PATTERN,
  errorCode,
  errorText,
  GoogleButton,
  logClerkError,
  PasscodeStep,
  PrimaryButton,
  sendErrorMessage,
} from '@/components/auth';
import { Text, TextInput } from '@/components/typography';

type InputRef = ComponentRef<typeof NativeTextInput>;

// Matches the minimum length set in the Clerk Dashboard (User & authentication → Password).
const MIN_PASSWORD_LENGTH = 15;

const FIELD_LABELS: Record<string, string> = {
  first_name: 'first name',
  last_name: 'last name',
  password: 'password',
  email_address: 'email',
};

function signUpErrorMessage(error: unknown) {
  const code = errorCode(error);
  if (code === 'form_identifier_exists') return 'An account with this email already exists. Log in instead.';
  if (code === 'too_many_requests') return 'Too many requests. Wait a minute and try again.';
  // Password and format problems: Clerk's own message explains the rule that failed.
  if (code?.startsWith('form_')) return errorText(error) ?? CONNECTION_ERROR;
  return CONNECTION_ERROR;
}

export default function SignUpScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'details' | 'passcode'>('details');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signUp } = useSignUp();
  const lastNameInput = useRef<InputRef>(null);
  const emailInput = useRef<InputRef>(null);
  const passwordInput = useRef<InputRef>(null);
  const address = email.trim().toLowerCase();

  function goToLogIn() {
    if (router.canGoBack()) router.back();
    else router.replace('/sign-in');
  }

  function edit(setter: (value: string) => void) {
    return (value: string) => { setter(value); setError(''); };
  }

  async function createAccount() {
    if (busy) return;
    Keyboard.dismiss();
    if (!EMAIL_PATTERN.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Your password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setBusy(true);
    setError('');
    const { error: createError } = await signUp.password({
      emailAddress: address,
      password,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
    });
    if (createError) {
      logClerkError('sign-up', createError);
      setBusy(false);
      setError(signUpErrorMessage(createError));
      return;
    }
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    setBusy(false);
    if (sendError) {
      logClerkError('send code', sendError);
      setError(sendErrorMessage(sendError));
      return;
    }
    setStep('passcode');
  }

  async function verify(code: string) {
    const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code });
    // A retry after a successful check reports "already verified"; the sign-up can still finish.
    if (verifyError && errorCode(verifyError) !== 'verification_already_verified') {
      logClerkError('verify code', verifyError);
      return codeErrorMessage(verifyError);
    }
    if (signUp.status !== 'complete') {
      logClerkError(`sign-up (status ${signUp.status}, missing ${signUp.missingFields.join(', ')})`, verifyError);
      const missing = signUp.missingFields.map((field) => FIELD_LABELS[field] ?? field.replace(/_/g, ' '));
      return missing.length
        ? `We still need your ${missing.join(' and ')}. Go back and add it, then try again.`
        : 'We couldn’t finish creating your account. Please try again.';
    }
    // Activates the session. The root layout's guard then moves to /teams, so no navigation here.
    const { error: finalizeError } = await signUp.finalize({ navigate: () => {} });
    if (finalizeError) {
      logClerkError('finalize sign-up', finalizeError);
      return 'We couldn’t finish creating your account. Please try again.';
    }
    return null;
  }

  async function resend() {
    const { error: resendError } = await signUp.verifications.sendEmailCode();
    if (!resendError) return null;
    logClerkError('resend code', resendError);
    return sendErrorMessage(resendError);
  }

  function continueWithGoogle() {
    // TODO: wire up Clerk's Google sign-in once it's enabled in the Clerk dashboard.
    setError('Google sign-in isn’t set up yet. Use your email for now.');
  }

  return (
    <AuthLayout>
      {step === 'passcode' ? (
        <PasscodeStep
          email={address}
          onVerify={verify}
          onResend={resend}
          onBack={() => { setStep('details'); setError(''); }}
        />
      ) : (
        <>
          <Text accessibilityRole="header" style={authStyles.title}>Create your account</Text>

          <GoogleButton disabled={busy} onPress={continueWithGoogle} />

          <Text style={authStyles.divider}>or</Text>

          <View style={styles.fields}>
            <View style={styles.nameRow}>
              <TextInput
                accessibilityLabel="First name"
                placeholder="First name"
                placeholderTextColor="#999999"
                value={firstName}
                onChangeText={edit(setFirstName)}
                autoComplete="given-name"
                textContentType="givenName"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => lastNameInput.current?.focus()}
                style={[authStyles.input, styles.nameInput]}
              />
              <TextInput
                ref={lastNameInput}
                accessibilityLabel="Last name"
                placeholder="Last name"
                placeholderTextColor="#999999"
                value={lastName}
                onChangeText={edit(setLastName)}
                autoComplete="family-name"
                textContentType="familyName"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => emailInput.current?.focus()}
                style={[authStyles.input, styles.nameInput]}
              />
            </View>
            <TextInput
              ref={emailInput}
              accessibilityLabel="Email"
              placeholder="Enter email"
              placeholderTextColor="#999999"
              value={email}
              onChangeText={edit(setEmail)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => passwordInput.current?.focus()}
              style={authStyles.input}
            />
            <TextInput
              ref={passwordInput}
              accessibilityLabel="Password"
              accessibilityHint={`At least ${MIN_PASSWORD_LENGTH} characters`}
              placeholder="Create password"
              placeholderTextColor="#999999"
              value={password}
              onChangeText={edit(setPassword)}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              textContentType="newPassword"
              passwordRules={`minlength: ${MIN_PASSWORD_LENGTH};`}
              returnKeyType="go"
              onSubmitEditing={createAccount}
              style={[authStyles.input, error && authStyles.invalid]}
            />
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text>
          ) : (
            <Text style={styles.hint}>At least {MIN_PASSWORD_LENGTH} characters.</Text>
          )}

          <PrimaryButton label="Sign up" busy={busy} onPress={createAccount} />

          <Text style={authStyles.terms}>
            By continuing, you agree to our <Text style={authStyles.underlined}>Terms</Text> and{' '}
            <Text style={authStyles.underlined}>Privacy Policy</Text>
          </Text>
          <Text style={authStyles.switchPrompt}>
            Already have an account?{' '}
            <Text accessibilityRole="link" onPress={goToLogIn} style={authStyles.underlined}>Log in</Text>
          </Text>
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  fields: { gap: 12 },
  nameRow: { flexDirection: 'row', gap: 12 },
  nameInput: { flex: 1, minWidth: 0 },
  hint: { fontSize: 13, color: '#999999', marginTop: 6 },
});
