import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import MemberDetailsScreen from '@/components/member-details-screen';
import { useMembers } from '@/context/members';
import { useProfile } from '@/context/profile';
import { useTeams } from '@/context/teams';
import { errorMessage } from '@/lib/api';

import { Fonts } from '@/constants/fonts';

// your profile is your own member page ("Member (yourself)" in Figma):
// name, location, phone, availability and skills, with your email shown but not editable
export default function ProfileScreen() {
  const { userId } = useAuth();
  const { members, status } = useMembers();
  const me = members.find((member) => member.userId === userId);

  if (me) return <MemberDetailsScreen key={me.id} member={me} backTo="/more" />;
  return <AccountOnly loading={status === 'loading'} />;
}

// before your team record loads (or with no team picked) you can still change your name
function AccountOnly({ loading }: { loading: boolean }) {
  const { profile, saveName } = useProfile();
  const { refresh: refreshTeams } = useTeams();
  const [name, setName] = useState(profile.fullName);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function save() {
    const trimmed = name.trim();
    if (trimmed === profile.fullName) return;
    if (!trimmed) {
      setName(profile.fullName);
      setError('Enter a name.');
      return;
    }
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await saveName(trimmed);
      await refreshTeams();
      setStatus('Name saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/more');
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={styles.backButton}>
            <Text aria-hidden style={styles.backArrow}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{profile.fullName || 'Profile'}</Text>
          <Text style={styles.email}>{profile.email}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput accessibilityLabel="Name" value={name} placeholder="Add name" placeholderTextColor="#999999" editable={!saving} maxLength={100} autoCapitalize="words" autoComplete="name" textContentType="name" onChangeText={(value) => { setName(value); setStatus(''); }} onEndEditing={save} returnKeyType="done" style={styles.input} />
          </View>

          {loading ? (
            <View style={styles.row}>
              <ActivityIndicator size="small" color="#505050" />
              <Text style={styles.status}>Loading your team details…</Text>
            </View>
          ) : (
            <Text style={styles.status}>Pick a team to add your location, phone, availability and skills.</Text>
          )}
          {saving && <Text style={styles.status}>Saving…</Text>}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// same header and fields as member-details-screen.tsx
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, paddingTop: 48, paddingBottom: 32, alignItems: 'center', gap: 12 },
  backButton: { position: 'absolute', top: 48, left: 12, width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 28, lineHeight: 34, color: '#000000' },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center', paddingHorizontal: 12 },
  email: { fontSize: 16, lineHeight: 22, letterSpacing: -0.3, color: '#505050', textAlign: 'center' },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 16, lineHeight: 20, letterSpacing: -0.3, color: '#999999' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: '#000000', letterSpacing: -0.3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  status: { color: '#505050', fontSize: 14, lineHeight: 20 },
  error: { color: '#C93838', fontSize: 14, lineHeight: 20 },
});
