import { type ComponentRef, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/context/profile';

import { Fonts } from '@/constants/fonts';

export default function ProfileScreen() {
  const { profile, saveProfile } = useProfile();
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [saved, setSaved] = useState(false);
  const emailInput = useRef<ComponentRef<typeof TextInput>>(null);
  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  const nameValid = trimmedName.length > 0;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const changed = trimmedName !== profile.fullName || trimmedEmail !== profile.email;
  const canSave = changed && nameValid && emailValid;

  function save() {
    if (!canSave) return;
    saveProfile({ fullName: trimmedName, email: trimmedEmail });
    setFullName(trimmedName);
    setEmail(trimmedEmail);
    setSaved(true);
    Keyboard.dismiss();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.title}>Profile</Text>
            <Text style={styles.description}>Your name and email stay the same across all of your teams.</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                accessibilityLabel="Full Name"
                value={fullName}
                onChangeText={(value) => { setFullName(value); setSaved(false); }}
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => emailInput.current?.focus()}
                style={styles.input}
              />
              {changed && !nameValid && <Text accessibilityRole="alert" style={styles.error}>Enter your full name.</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                ref={emailInput}
                accessibilityLabel="Email"
                value={email}
                onChangeText={(value) => { setEmail(value); setSaved(false); }}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={save}
                style={[styles.input, styles.emailInput]}
              />
              {changed && !emailValid && <Text accessibilityRole="alert" style={styles.error}>Enter a valid email address.</Text>}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={save}
              style={({ pressed }) => [styles.saveButton, !canSave && styles.disabledButton, pressed && styles.pressed]}>
              <Text style={styles.saveLabel}>Save</Text>
            </Pressable>
            {saved && <Text accessibilityLiveRegion="polite" style={styles.savedText}>Profile saved.</Text>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 38, paddingVertical: 40 },
  form: { width: '100%', maxWidth: 390, paddingTop: 96 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 20, letterSpacing: -0.3, color: '#505050', textAlign: 'center', marginBottom: 6 },
  field: { gap: 6, marginBottom: 12 },
  label: { fontSize: 16, lineHeight: 20, letterSpacing: -0.3, color: '#999999' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  emailInput: { color: '#999999' },
  saveButton: { minHeight: 44, marginTop: 20, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#171717' },
  disabledButton: { backgroundColor: '#A3A3A3' },
  saveLabel: { color: '#FFFFFF', fontSize: 16, lineHeight: 24 },
  savedText: { color: '#505050', fontSize: 14, textAlign: 'center', marginTop: 12 },
  error: { color: '#C93838', fontSize: 13 },
  pressed: { opacity: 0.7 },
});
