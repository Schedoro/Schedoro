import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';

import JobSelectionSheet from '@/components/job-selection-sheet';
import { type Team, useTeams } from '@/context/teams';
import { errorMessage } from '@/lib/api';

type Props = { team: Team; onClose: () => void; onRenamed: (name: string) => void };

// rename is for owners and managers, delete is owner only. the backend checks the same thing
export default function TeamSettingsSheet({ team, onClose, onRenamed }: Props) {
  const { renameTeam, deleteTeam } = useTeams();
  const [name, setName] = useState(team.name);
  const [busy, setBusy] = useState<'saving' | 'deleting' | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState('');
  const canDelete = team.myRole === 'owner';
  const unchanged = name.trim() === team.name;

  function close() {
    if (busy) return;
    Keyboard.dismiss();
    onClose();
  }

  async function save() {
    if (busy || unchanged) return;
    if (!name.trim()) {
      setError('Enter a team name.');
      return;
    }
    Keyboard.dismiss();
    setBusy('saving');
    setError('');
    try {
      const renamed = await renameTeam(team.id, name);
      onRenamed(renamed.name); // closes the sheet, the team screen shows the confirmation
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy('deleting');
    setError('');
    try {
      await deleteTeam(team.id);
      router.replace('/teams'); // this team is gone, so pick another one
    } catch (e) {
      setError(errorMessage(e));
      setBusy(null);
    }
  }

  return (
    <JobSelectionSheet title="Team settings" onClose={close}>
      <View style={styles.field}>
        <Text style={styles.label}>Team name</Text>
        <TextInput
          accessibilityLabel="Team name"
          value={name}
          onChangeText={(value) => { setName(value); setError(''); }}
          editable={!busy}
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={save}
          style={styles.input}
        />
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!busy || unchanged, busy: busy === 'saving' }}
        disabled={!!busy || unchanged}
        onPress={save}
        style={({ pressed }) => [styles.button, styles.darkButton, (pressed || !!busy || unchanged) && styles.dimmed]}>
        {busy === 'saving' && <ActivityIndicator size="small" color="#FFFFFF" />}
        <Text style={[styles.buttonLabel, styles.whiteLabel]}>{busy === 'saving' ? 'Saving…' : 'Save name'}</Text>
      </Pressable>

      {canDelete && (
        <View style={styles.danger}>
          {confirmingDelete ? (
            <>
              <Text style={styles.value}>Delete {team.name}? This also deletes its jobs and members, and it can’t be undone.</Text>
              <View style={styles.confirmActions}>
                <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => setConfirmingDelete(false)} style={[styles.button, styles.outlinedButton, styles.confirmButton, !!busy && styles.dimmed]}>
                  <Text style={styles.buttonLabel}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!busy, busy: busy === 'deleting' }} disabled={!!busy} onPress={remove} style={[styles.button, styles.deleteButton, styles.confirmButton, !!busy && styles.dimmed]}>
                  {busy === 'deleting' && <ActivityIndicator size="small" color="#FFFFFF" />}
                  <Text style={[styles.buttonLabel, styles.whiteLabel]}>{busy === 'deleting' ? 'Deleting…' : 'Delete'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => { Keyboard.dismiss(); setConfirmingDelete(true); }} style={({ pressed }) => [styles.button, styles.deleteButton, (pressed || !!busy) && styles.dimmed]}>
              <Image source={require('@/assets/images/TrashIcon.svg')} tintColor="#FFFFFF" style={styles.icon} />
              <Text style={[styles.buttonLabel, styles.whiteLabel]}>Delete team</Text>
            </Pressable>
          )}
        </View>
      )}
    </JobSelectionSheet>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 16, lineHeight: 20, letterSpacing: -0.3, color: '#999999' },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: '#000000' },
  value: { fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  error: { fontSize: 14, lineHeight: 20, color: '#C93838' },
  button: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  darkButton: { backgroundColor: '#171717' },
  outlinedButton: { borderWidth: 1, borderColor: '#E5E5E5' },
  deleteButton: { backgroundColor: '#E53135' },
  buttonLabel: { fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  whiteLabel: { color: '#FFFFFF' },
  icon: { width: 18, height: 18 },
  danger: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E5E5', gap: 8 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1 },
  dimmed: { opacity: 0.7 },
});
