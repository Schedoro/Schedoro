import { Image } from 'expo-image';
import { useAuth } from '@clerk/expo';
import { type Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import JobSelectionSheet from '@/components/job-selection-sheet';
import { AvailabilityField } from '@/components/availability-editor';
import { SkillsField } from '@/components/skill-picker';
import { canManage, type MemberChanges, type TeamMember, useMembers } from '@/context/members';
import { useProfile } from '@/context/profile';
import { useTeams } from '@/context/teams';
import { errorMessage } from '@/lib/api';

import { Fonts } from '@/constants/fonts';

const roleLabels = { owner: 'Owner', manager: 'Manager', worker: 'Worker' } as const;
type Sheet = 'role' | 'remove' | 'remind-availability' | 'remind-skills' | null;

// backTo is where the arrow goes when there's no history, profile passes '/more'
type Props = { member: TeamMember; onRemoving?: (member?: TeamMember) => void; backTo?: Href };

export default function MemberDetailsScreen({ member, onRemoving, backTo = '/team' }: Props) {
  const { userId } = useAuth();
  const { saveName: saveAccountName } = useProfile();
  const { updateMember, removeMember, refresh: refreshMembers } = useMembers();
  const { saveReminderDraft, selectedTeam, teams, refresh: refreshTeams } = useTeams();
  const team = selectedTeam ?? teams[0];
  const teamId = team?.id;
  // your own page doubles as the profile: no role, no remind/remove
  const isSelf = !!member.userId && member.userId === userId;
  // owners can edit anyone, managers can edit workers, everyone can edit themselves
  const canEdit = isSelf || canManage(team?.myRole, member.role);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [name, setName] = useState(member.fullName);
  const [location, setLocation] = useState(member.location);
  const [phone, setPhone] = useState(member.phone);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // the bottom buttons take most of the screen with the keyboard up, so hide them while typing
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // every edit goes straight to the api. controls are disabled while it saves so edits don't overlap
  async function save(changes: MemberChanges) {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await updateMember(member.id, changes);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setSaving(false);
    }
  }

  // for the availability editor, which shows the error itself
  async function saveOrError(changes: MemberChanges) {
    setSaving(true);
    setError('');
    try {
      await updateMember(member.id, changes);
      return null;
    } catch (e) {
      return errorMessage(e);
    } finally {
      setSaving(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace(backTo);
  }

  function openSheet(value: Sheet) {
    Keyboard.dismiss();
    setSheet(value);
  }

  function saveName() {
    const trimmed = name.trim();
    if (trimmed === member.fullName) return;
    if (!trimmed) {
      setName(member.fullName);
      setError('Enter a name.');
      return;
    }
    if (isSelf) void saveOwnName(trimmed);
    else void save({ fullName: trimmed });
  }

  // your name lives on your account, the backend copies it onto your team records when teams load
  async function saveOwnName(fullName: string) {
    setSaving(true);
    setError('');
    setStatus('');
    try {
      await saveAccountName(fullName);
      await refreshTeams();
      await refreshMembers();
      setStatus('Name saved.');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function saveLocation() {
    if (location.trim() !== member.location) void save({ location: location.trim() });
  }

  function savePhone() {
    if (phone.trim() !== member.phone) void save({ phone: phone.trim() });
  }

  async function confirmRemove() {
    if (removing) return;
    setRemoving(true);
    setError('');
    onRemoving?.(member);
    try {
      await removeMember(member.id);
      setSheet(null);
      goBack();
    } catch (e) {
      onRemoving?.(undefined);
      setRemoving(false);
      setError(errorMessage(e));
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={styles.backButton}>
            <Text aria-hidden style={styles.backArrow}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{member.fullName || member.email}</Text>
          <Text style={styles.email}>{member.fullName ? member.email : 'Invited, hasn’t joined yet'}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              {canEdit
                ? <TextInput accessibilityLabel="Member name" value={name} placeholder="Add name" placeholderTextColor="#999999" editable={!saving} maxLength={100} autoCapitalize="words" onChangeText={setName} onEndEditing={saveName} returnKeyType="done" style={styles.input} />
                : <ReadOnly value={member.fullName} />}
            </View>
            {!isSelf && <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              {/* managers can only give the worker role, so only owners get the picker */}
              {team?.myRole === 'owner' ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Role: ${roleLabels[member.role]}`} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => openSheet('role')} style={styles.inputRow}>
                  <Text style={[styles.value, styles.fieldValue]}>{roleLabels[member.role]}</Text>
                  <View aria-hidden style={styles.chevron} />
                </Pressable>
              ) : <ReadOnly value={roleLabels[member.role]} />}
            </View>}
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              {canEdit
                ? <TextInput accessibilityLabel="Member location" value={location} placeholder="Add location" placeholderTextColor="#999999" editable={!saving} onChangeText={setLocation} onEndEditing={saveLocation} returnKeyType="done" style={styles.input} />
                : <ReadOnly value={member.location} />}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              {canEdit
                ? <TextInput accessibilityLabel="Member phone" value={phone} placeholder="Add phone" placeholderTextColor="#999999" editable={!saving} keyboardType="phone-pad" textContentType="telephoneNumber" maxLength={30} onChangeText={setPhone} onEndEditing={savePhone} returnKeyType="done" style={styles.input} />
                : <ReadOnly value={member.phone} />}
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Availability</Text>
              <AvailabilityField windows={member.availability} readOnly={!canEdit} disabled={saving} onSave={(availability) => saveOrError({ availability })} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Skills</Text>
              <SkillsField skills={member.skills} readOnly={!canEdit} disabled={saving} onSave={(skills) => { void save({ skills }); }} />
            </View>

            {saving && (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color="#505050" />
                <Text style={styles.status}>Saving…</Text>
              </View>
            )}
            {error ? <Text accessibilityRole="alert" style={styles.saveError}>{error}</Text> : null}
            {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
          </View>
        </ScrollView>

        {canEdit && !isSelf && !keyboardOpen && <View style={styles.actions}>
          {(['availability', 'skills'] as const).map((kind) => (
            <Pressable key={kind} accessibilityRole="button" onPress={() => openSheet(kind === 'availability' ? 'remind-availability' : 'remind-skills')} style={({ pressed }) => [styles.actionButton, styles.outlinedButton, pressed && styles.pressed]}>
              <Image source={require('@/assets/images/SendIcon.svg')} tintColor="#000000" style={styles.smallIcon} />
              <Text style={styles.actionLabel}>Remind to update {kind}</Text>
            </Pressable>
          ))}
          <Pressable accessibilityRole="button" onPress={() => openSheet('remove')} style={({ pressed }) => [styles.actionButton, styles.removeButton, pressed && styles.pressed]}>
            <Image source={require('@/assets/images/RemoveMemberIcon.svg')} tintColor="#FFFFFF" style={styles.smallIcon} />
            <Text style={[styles.actionLabel, styles.whiteLabel]}>Remove member</Text>
          </Pressable>
        </View>}
      </KeyboardAvoidingView>

      {sheet === 'role' && (
        <JobSelectionSheet title="Role" options={Object.values(roleLabels)} selected={[roleLabels[member.role]]} onClose={() => setSheet(null)} onSelect={(label) => {
          const role = (Object.keys(roleLabels) as TeamMember['role'][]).find((key) => roleLabels[key] === label)!;
          setSheet(null);
          if (role !== member.role) void save({ role });
        }} />
      )}
      {(sheet === 'remind-availability' || sheet === 'remind-skills') && (
        <JobSelectionSheet title="Reminder" onClose={() => setSheet(null)}>
          <Text style={styles.sheetText}>To: {member.email}</Text>
          <Text style={styles.value}>Please update your {sheet === 'remind-availability' ? 'availability' : 'skills'} in Schedoro.</Text>
          <Text style={styles.sheetText}>Save this as a draft. Email delivery is not connected yet.</Text>
          <Pressable accessibilityRole="button" onPress={() => {
            if (teamId) saveReminderDraft(teamId, member.id, sheet === 'remind-availability' ? 'availability' : 'skills');
            setStatus('Reminder draft saved. Email has not been sent.'); setSheet(null);
          }} style={[styles.actionButton, styles.darkButton]}><Text style={[styles.actionLabel, styles.whiteLabel]}>Save draft</Text></Pressable>
        </JobSelectionSheet>
      )}
      {sheet === 'remove' && (
        <JobSelectionSheet title="Remove member?" onClose={() => { if (!removing) setSheet(null); }}>
          <Text style={styles.value}>Remove {member.fullName || member.email} from this team?</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.confirmActions}>
            <Pressable accessibilityRole="button" disabled={removing} onPress={() => setSheet(null)} style={[styles.actionButton, styles.outlinedButton, styles.confirmButton, removing && styles.pressed]}><Text style={styles.actionLabel}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: removing, busy: removing }} disabled={removing} onPress={confirmRemove} style={[styles.actionButton, styles.removeButton, styles.confirmButton, removing && styles.pressed]}>
              {removing && <ActivityIndicator size="small" color="#FFFFFF" />}
              <Text style={[styles.actionLabel, styles.whiteLabel]}>{removing ? 'Removing…' : 'Remove'}</Text>
            </Pressable>
          </View>
        </JobSelectionSheet>
      )}
    </SafeAreaView>
  );
}

// plain text, like the "Member (as worker)" frame in Figma
function ReadOnly({ value }: { value: string }) {
  return <Text style={[styles.value, !value && styles.placeholderText]}>{value || 'Not set'}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingBottom: 24 },
  header: { flexShrink: 0, width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, paddingTop: 48, paddingBottom: 32, alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center', paddingHorizontal: 12 },
  email: { fontSize: 16, lineHeight: 22, letterSpacing: -0.3, color: '#505050', textAlign: 'center' },
  backButton: { position: 'absolute', top: 48, left: 12, width: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 28, lineHeight: 34, color: '#000000' },
  form: { paddingHorizontal: 40, gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 16, lineHeight: 20, letterSpacing: -0.3, color: '#999999' },
  inputRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12 },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, color: '#000000', letterSpacing: -0.3 },
  value: { flexShrink: 1, fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  fieldValue: { flex: 1 },
  chevron: { width: 10, height: 10, borderBottomWidth: 1.5, borderRightWidth: 1.5, borderColor: '#000000', transform: [{ rotate: '45deg' }], marginTop: -4, marginRight: 2 },
  smallIcon: { width: 18, height: 18 },
  actions: { flexShrink: 0, width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, paddingTop: 16, paddingBottom: 24, gap: 12, backgroundColor: '#FFFFFF' },
  actionButton: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  outlinedButton: { borderWidth: 1, borderColor: '#E5E5E5' },
  removeButton: { backgroundColor: '#E53135' },
  darkButton: { backgroundColor: '#171717' },
  actionLabel: { flexShrink: 1, fontSize: 16, lineHeight: 22, color: '#000000', textAlign: 'center', letterSpacing: -0.3 },
  whiteLabel: { color: '#FFFFFF' },
  status: { color: '#505050', fontSize: 14, lineHeight: 20 },
  savingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveError: { color: '#C93838', fontSize: 14, lineHeight: 20 },
  sheetText: { color: '#505050', fontSize: 16, lineHeight: 22 },
  error: { color: '#C93838', fontSize: 13 },
  placeholderText: { color: '#999999' },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1 },
  pressed: { opacity: 0.7 },
});
