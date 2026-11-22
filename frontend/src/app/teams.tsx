import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeams } from '@/context/teams';
import { errorMessage } from '@/lib/api';

import { Fonts } from '@/constants/fonts';

export default function TeamsScreen() {
  const { teams, status, error, refresh, selectTeam, createTeam } = useTeams();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const { width } = useWindowDimensions();
  const artworkWidth = Math.min(343, width - 40);
  const artworkHeight = artworkWidth * (474 / 343);

  function enterTeam(id: string) {
    selectTeam(id);
    router.replace('/schedule');
  }

  async function retry() {
    setRetrying(true);
    await refresh();
    setRetrying(false);
  }

  function closeCreateTeam() {
    if (saving) return;
    Keyboard.dismiss();
    setCreating(false);
    setName('');
    setSubmitted(false);
    setCreateError('');
  }

  async function submitTeam() {
    if (saving) return;
    setSubmitted(true);
    if (!name.trim()) return;
    Keyboard.dismiss();
    setSaving(true);
    setCreateError('');
    try {
      const team = await createTeam(name);
      setSaving(false);
      setCreating(false);
      setName('');
      setSubmitted(false);
      enterTeam(team.id);
    } catch (e) {
      setCreateError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Image
        source={require('@/assets/images/logos/SchedoroLogoArtwork.svg')}
        tintColor="rgba(94, 94, 253, 0.10)"
        pointerEvents="none"
        accessible={false}
        style={[styles.artwork, { width: artworkWidth, height: artworkHeight, bottom: -(artworkHeight * 2) / 3 + 5 }]}
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.title}>Teams</Text>
            <Text style={styles.description}>Create a team or join one via email invite link.</Text>
            <View style={styles.teams}>
              {status === 'loading' && <ActivityIndicator accessibilityLabel="Loading your teams" color="#171717" />}
              {status === 'error' && (
                <View accessibilityRole="alert" style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                  <Pressable accessibilityRole="button" disabled={retrying} onPress={retry} style={({ pressed }) => [styles.retryButton, (pressed || retrying) && styles.pressed]}>
                    <Text style={styles.retryLabel}>{retrying ? 'Trying again…' : 'Try again'}</Text>
                  </Pressable>
                </View>
              )}
              {status === 'ready' && !teams.length && <Text style={styles.empty}>You’re not on any teams yet.</Text>}
              {teams.map((team) => (
                <Pressable
                  key={team.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${team.name}`}
                  onPress={() => enterTeam(team.id)}
                  style={({ pressed }) => [styles.teamButton, pressed && styles.pressed]}>
                  <Text style={styles.teamLabel}>{team.name}</Text>
                  <Text aria-hidden style={styles.arrow}>→</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.divider}>or</Text>
            <Pressable accessibilityRole="button" onPress={() => setCreating(true)} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <Text style={styles.createLabel}>Create team</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal visible={creating} transparent animationType="fade" onRequestClose={closeCreateTeam}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel creating team" onPress={closeCreateTeam} style={StyleSheet.absoluteFill} />
          <View style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.dialogTitle}>Create team</Text>
            <TextInput
              accessibilityLabel="Team name, required"
              placeholder="Enter team name"
              placeholderTextColor="#999999"
              value={name}
              onChangeText={(value) => { setName(value); setCreateError(''); }}
              editable={!saving}
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={submitTeam}
              style={[styles.input, submitted && !name.trim() && styles.invalid]}
            />
            {submitted && !name.trim() && <Text accessibilityRole="alert" style={styles.error}>Enter a team name.</Text>}
            {createError ? <Text accessibilityRole="alert" style={styles.error}>{createError}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={submitTeam} style={({ pressed }) => [styles.createButton, (pressed || saving) && styles.pressed]}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createLabel}>Create team</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={closeCreateTeam} style={styles.cancelButton}>
              <Text style={styles.teamLabel}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  safeArea: { flex: 1 },
  artwork: { position: 'absolute', alignSelf: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36, paddingVertical: 40 },
  form: { width: '100%', maxWidth: 390 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 22, color: '#505050', letterSpacing: -0.4, textAlign: 'center', marginBottom: 20 },
  teams: { gap: 12 },
  teamButton: { minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  teamLabel: { fontSize: 16, lineHeight: 24, color: '#505050', textAlign: 'center', flexShrink: 1 },
  arrow: { fontSize: 24, lineHeight: 26, color: '#505050' },
  divider: { marginVertical: 12, fontSize: 16, lineHeight: 20, color: '#999999', textAlign: 'center' },
  createButton: { minHeight: 44, borderRadius: 8, backgroundColor: '#171717', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  createLabel: { fontSize: 16, lineHeight: 24, color: '#FFFFFF' },
  pressed: { opacity: 0.7 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.25)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 390, padding: 24, borderRadius: 16, backgroundColor: '#FFFFFF', gap: 16 },
  dialogTitle: { fontSize: 24, lineHeight: 30, fontFamily: Fonts.bold, color: '#171717' },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#171717' },
  invalid: { borderColor: '#C93838' },
  error: { color: '#C93838', fontSize: 13 },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 16, lineHeight: 22, color: '#999999', textAlign: 'center' },
  errorBox: { gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F5C2C2', backgroundColor: '#FFF5F5' },
  errorText: { fontSize: 14, lineHeight: 20, color: '#C93838' },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryLabel: { fontSize: 14, color: '#171717', textDecorationLine: 'underline' },
});
