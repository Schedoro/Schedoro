import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeams } from '@/context/teams';

import { Fonts } from '@/constants/fonts';

export default function TeamsScreen() {
  const { teams, selectTeam, createTeam } = useTeams();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { width } = useWindowDimensions();
  const artworkWidth = Math.min(343, width - 40);
  const artworkHeight = artworkWidth * (474 / 343);

  function enterTeam(id: string) {
    selectTeam(id);
    router.replace('/schedule');
  }

  function closeCreateTeam() {
    Keyboard.dismiss();
    setCreating(false);
    setName('');
    setSubmitted(false);
  }

  function submitTeam() {
    setSubmitted(true);
    if (!name.trim()) return;
    const team = createTeam(name);
    closeCreateTeam();
    enterTeam(team.id);
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
              onChangeText={setName}
              maxLength={80}
              returnKeyType="done"
              onSubmitEditing={submitTeam}
              style={[styles.input, submitted && !name.trim() && styles.invalid]}
            />
            {submitted && !name.trim() && <Text accessibilityRole="alert" style={styles.error}>Enter a team name.</Text>}
            <Pressable accessibilityRole="button" onPress={submitTeam} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <Text style={styles.createLabel}>Create team</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={closeCreateTeam} style={styles.cancelButton}>
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
});
