import { useSignIn } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard } from 'react-native';

import {
  AuthLayout,
  authStyles,
  codeErrorMessage,
  EMAIL_PATTERN,
  errorCode,
  GoogleButton,
  logClerkError,
  PasscodeStep,
  PrimaryButton,
  sendErrorMessage,
} from '@/components/auth';
import { Text, TextInput } from '@/components/typography';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'passcode'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useSignIn();
  const address = email.trim().toLowerCase();

  function goToSignUp() {
    router.push({ pathname: '/sign-up', params: EMAIL_PATTERN.test(address) ? { email: address } : {} });
  }

  async function logIn() {
    if (busy) return;
    Keyboard.dismiss();
    if (!EMAIL_PATTERN.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError('');
    const { error: sendError } = await signIn.emailCode.sendCode({ emailAddress: address });
    setBusy(false);
    if (sendError) {
      logClerkError('send code', sendError);
      setError(errorCode(sendError) === 'form_identifier_not_found'
        ? 'There’s no account with this email yet. Sign up below.'
        : sendErrorMessage(sendError));
      return;
    }
    setStep('passcode');
  }

  async function verify(code: string) {
    const { error: verifyError } = await signIn.emailCode.verifyCode({ code });
    // A retry after a successful check reports "already verified"; the sign-in can still finish.
    if (verifyError && errorCode(verifyError) !== 'verification_already_verified') {
      logClerkError('verify code', verifyError);
      return codeErrorMessage(verifyError);
    }
    if (signIn.status !== 'complete') {
      logClerkError('sign-in (status ' + signIn.status + ')', verifyError);
      return 'We couldn’t finish signing you in. Please try again.';
    }
    // Activates the session. The root layout's guard then moves to /teams, so no navigation here.
    const { error: finalizeError } = await signIn.finalize({ navigate: () => {} });
    if (finalizeError) {
      logClerkError('finalize sign-in', finalizeError);
      return 'We couldn’t finish signing you in. Please try again.';
    }
    return null;
  }

  async function resend() {
    const { error: resendError } = await signIn.emailCode.sendCode();
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
          onBack={() => { setStep('email'); setError(''); }}
        />
      ) : (
        <>
          <Text accessibilityRole="header" style={authStyles.title}>Welcome Back!</Text>

          <GoogleButton disabled={busy} onPress={continueWithGoogle} />

          <Text style={authStyles.divider}>or</Text>

          <TextInput
            accessibilityLabel="Email"
            placeholder="Enter email"
            placeholderTextColor="#999999"
            value={email}
            onChangeText={(value) => { setEmail(value); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="go"
            onSubmitEditing={logIn}
            style={[authStyles.input, error && authStyles.invalid]}
          />
          {error ? <Text accessibilityRole="alert" style={authStyles.error}>{error}</Text> : null}

          <PrimaryButton label="Log in" busy={busy} onPress={logIn} />

          <Text style={authStyles.terms}>
            By continuing, you agree to our <Text style={authStyles.underlined}>Terms</Text> and{' '}
            <Text style={authStyles.underlined}>Privacy Policy</Text>
          </Text>
          <Text style={authStyles.switchPrompt}>
            Don’t have an account?{' '}
            <Text accessibilityRole="link" onPress={goToSignUp} style={authStyles.underlined}>Sign up</Text>
          </Text>
        </>
      )}
    </AuthLayout>
  );
}
