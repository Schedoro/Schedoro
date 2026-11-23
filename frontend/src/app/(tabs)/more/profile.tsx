import { useAuth } from '@clerk/expo';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkillsField } from '@/components/skill-picker';
import { useMembers } from '@/context/members';
import { useProfile } from '@/context/profile';
import { useTeams } from '@/context/teams';
import { errorMessage } from '@/lib/api';

import { Fonts } from '@/constants/fonts';

export default function ProfileScreen() {
  const { profile, saveName } = useProfile();
  const { userId } = useAuth();
  const { selectedTeam, teams, refresh: refreshTeams } = useTeams();
  const { members, updateMember, refresh: refreshMembers } = useMembers();
  const team = selectedTeam ?? teams[0];
  // your member record on this team, which is where skills live
  const me = members.find((member) => member.userId === userId);

  const [fullName, setFullName] = useState(profile.fullName);
  const [savingName, setSavingName] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const trimmedName = fullName.trim();
  const nameValid = trimmedName.length > 0;
  const changed = trimmedName !== profile.fullName;
  const canSave = changed && nameValid && !savingName;

  async function save() {
    if (!canSave) return;
    Keyboard.dismiss();
    setSavingName(true);
    setError('');
    setStatus('');
    try {
      await saveName(trimmedName);
      // the backend copies your account name onto your team records when the teams list loads
      await refreshTeams();
      await refreshMembers();
      setFullName(trimmedName);
      setStatus('Name saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingName(false);
    }
  }

  async function saveSkills(skills: string[]) {
    if (!me) return;
    setSavingSkills(true);
    setError('');
    setStatus('');
    try {
      await updateMember(me.id, { skills });
      setStatus('Skills saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSavingSkills(false);
    }
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
                onChangeText={(value) => { setFullName(value); setStatus(''); setError(''); }}
                editable={!savingName}
                autoComplete="name"
                textContentType="name"
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={save}
                style={styles.input}
              />
              {changed && !nameValid && <Text accessibilityRole="alert" style={styles.error}>Enter your full name.</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              {/* changing it means verifying the new address with Clerk, which isn't built yet */}
              <Text accessibilityLabel={`Email, ${profile.email}`} style={[styles.input, styles.readOnly]}>{profile.email}</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave, busy: savingName }}
              disabled={!canSave}
              onPress={save}
              style={({ pressed }) => [styles.saveButton, !canSave && styles.disabledButton, pressed && styles.pressed]}>
              {savingName && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={styles.saveLabel}>{savingName ? 'Saving…' : 'Save'}</Text>
            </Pressable>

            {me && team && (
              <View style={[styles.field, styles.skills]}>
                <Text style={styles.label}>Skills</Text>
                <Text style={styles.helper}>For {team.name}. Managers use these when assigning jobs.</Text>
                <SkillsField skills={me.skills} disabled={savingSkills} onSave={saveSkills} />
              </View>
            )}

            {savingSkills && <Text style={styles.status}>Saving skills…</Text>}
            {error ? <Text accessibilityRole="alert" style={[styles.error, styles.centered]}>{error}</Text> : null}
            {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
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
  skills: { marginTop: 32 },
  label: { fontSize: 16, lineHeight: 20, letterSpacing: -0.3, color: '#999999' },
  helper: { fontSize: 14, lineHeight: 20, color: '#505050' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  readOnly: { color: '#999999' },
  saveButton: { minHeight: 44, marginTop: 20, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 8, backgroundColor: '#171717' },
  disabledButton: { backgroundColor: '#A3A3A3' },
  saveLabel: { color: '#FFFFFF', fontSize: 16, lineHeight: 24 },
  status: { color: '#505050', fontSize: 14, textAlign: 'center', marginTop: 12 },
  error: { color: '#C93838', fontSize: 13 },
  centered: { textAlign: 'center', marginTop: 12 },
  pressed: { opacity: 0.7 },
});
