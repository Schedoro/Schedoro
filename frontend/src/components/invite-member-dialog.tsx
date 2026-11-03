import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useProfile } from '@/context/profile';
import { type InvitationRole, useTeams } from '@/context/teams';

import { Fonts } from '@/constants/fonts';

type Props = { teamId: string; onClose: () => void; onDraftSaved: (email: string) => void };
const roles: { value: InvitationRole; label: string }[] = [
  { value: 'worker', label: 'Worker' },
  { value: 'manager', label: 'Manager' },
];

export default function InviteMemberDialog({ teamId, onClose, onDraftSaved }: Props) {
  const { addInvitationDraft, invitationDrafts } = useTeams();
  const { profile } = useProfile();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<InvitationRole>('worker');
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState('');

  function close() {
    Keyboard.dismiss();
    onClose();
  }

  function invite() {
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError('Enter a valid email address.');
      return;
    }
    if (address === profile.email.trim().toLowerCase()) {
      setError('You are already a member of this team.');
      return;
    }
    if (invitationDrafts.some((draft) => draft.teamId === teamId && draft.email === address)) {
      setError('An invitation draft already exists for this email.');
      return;
    }
    addInvitationDraft(teamId, address, role);
    Keyboard.dismiss();
    onDraftSaved(address);
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close invitation" onPress={close} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.dialog}>
              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.title}>Invite Member</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close invitation" onPress={close} style={styles.closeButton}>
                  <View aria-hidden style={styles.closeIcon}>
                    <View style={[styles.closeStroke, styles.closeForward]} />
                    <View style={[styles.closeStroke, styles.closeBackward]} />
                  </View>
                </Pressable>
              </View>
              <Text style={styles.description}>The user has 1 week to join via email</Text>
              <TextInput
                accessibilityLabel="Email address"
                placeholder="Enter email address"
                placeholderTextColor="#999999"
                value={email}
                onChangeText={(value) => { setEmail(value); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={invite}
                style={[styles.input, error && styles.invalid]}
              />
              {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

              <View style={styles.roleField}>
                <Pressable
                  accessibilityRole="combobox"
                  accessibilityLabel={`Role: ${role === 'worker' ? 'Worker' : 'Manager'}`}
                  accessibilityState={{ expanded: roleOpen }}
                  onPress={() => { Keyboard.dismiss(); setRoleOpen((current) => !current); }}
                  style={styles.roleButton}>
                  <Text style={styles.roleLabel}>{role === 'worker' ? 'Worker' : 'Manager'}</Text>
                  <View aria-hidden style={[styles.chevron, roleOpen && styles.chevronOpen]} />
                </Pressable>
                {roleOpen && (
                  <View style={styles.roleOptions}>
                    {roles.map((option) => (
                      <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: role === option.value }} onPress={() => { setRole(option.value); setRoleOpen(false); }} style={[styles.option, role === option.value && styles.selectedOption]}>
                        <Text style={styles.roleLabel}>{option.label}</Text>
                        {role === option.value && <Text aria-hidden style={styles.checkmark}>✓</Text>}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={close} style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}>
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={invite} style={({ pressed }) => [styles.button, styles.inviteButton, pressed && styles.pressed]}>
                  <Text style={styles.inviteLabel}>Invite</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  safeArea: { flex: 1, justifyContent: 'center' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 390, borderRadius: 10, borderWidth: 1, borderColor: '#D5D5D5', backgroundColor: '#FFFFFF', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 24, lineHeight: 32, fontFamily: Fonts.bold, letterSpacing: -0.5, color: '#000000' },
  closeButton: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center', marginVertical: -6 },
  closeIcon: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  closeStroke: { position: 'absolute', width: 18, height: 2, borderRadius: 1, backgroundColor: '#000000' },
  closeForward: { transform: [{ rotate: '45deg' }] },
  closeBackward: { transform: [{ rotate: '-45deg' }] },
  description: { fontSize: 16, lineHeight: 24, color: '#999999', letterSpacing: -0.4, marginTop: 4, marginBottom: 16 },
  input: { minHeight: 48, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#000000', fontSize: 18 },
  invalid: { borderColor: '#C93838' },
  error: { fontSize: 13, color: '#C93838', marginTop: 6 },
  roleField: { marginTop: 14 },
  roleButton: { minHeight: 48, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  roleLabel: { color: '#000000', fontSize: 18, lineHeight: 24 },
  chevron: { width: 10, height: 10, borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: '#000000', transform: [{ rotate: '45deg' }], marginRight: 4, marginTop: -4 },
  chevronOpen: { transform: [{ rotate: '225deg' }], marginTop: 4 },
  roleOptions: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, marginTop: 6, overflow: 'hidden' },
  option: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectedOption: { backgroundColor: '#F5F5FF' },
  checkmark: { fontSize: 18, color: '#5E5EFD' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 28 },
  button: { minHeight: 48, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  cancelButton: { borderWidth: 1, borderColor: '#E5E5E5' },
  cancelLabel: { color: '#000000', fontSize: 18, lineHeight: 26 },
  inviteButton: { backgroundColor: '#171717' },
  inviteLabel: { color: '#FFFFFF', fontSize: 18, lineHeight: 26 },
  pressed: { opacity: 0.7 },
});
