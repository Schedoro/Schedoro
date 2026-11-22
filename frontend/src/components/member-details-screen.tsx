import { Image } from 'expo-image';
import { router } from 'expo-router';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import JobSelectionSheet from '@/components/job-selection-sheet';
import { hoursBetween, type MemberChanges, type TeamMember, useMembers, weekdays } from '@/context/members';
import { useTeams } from '@/context/teams';
import { errorMessage } from '@/lib/api';

import { Fonts } from '@/constants/fonts';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/; // same check as the backend
const roleLabels = { owner: 'Owner', manager: 'Manager', worker: 'Worker' } as const;
type Sheet = 'role' | 'availability' | 'remove' | 'remind-availability' | 'remind-skills' | null;

type Props = { member: TeamMember; onRemoving: (member?: TeamMember) => void };

export default function MemberDetailsScreen({ member, onRemoving }: Props) {
  const { updateMember, removeMember } = useMembers();
  const { saveReminderDraft, selectedTeam, teams } = useTeams();
  const teamId = (selectedTeam ?? teams[0])?.id;
  const [sheet, setSheet] = useState<Sheet>(null);
  const [newSkill, setNewSkill] = useState('');
  const [name, setName] = useState(member.fullName);
  const [location, setLocation] = useState(member.location);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollToSkills = useRef(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [times, setTimes] = useState<Record<string, { start: string; end: string }>>({});
  const [timesError, setTimesError] = useState('');
  const availability = member.availability.map(({ day, start, end }) => {
    const count = hoursBetween(start, end);
    return `${day} ${Number.isInteger(count) && count >= 1 && count <= 20 ? String.fromCodePoint(0x245f + count) : count}`;
  }).join(', ');

  // the bottom buttons take most of the screen with the keyboard up, so hide them while typing
  // and scroll the skill input into view if that's what was tapped
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      if (scrollToSkills.current) scrollRef.current?.scrollToEnd({ animated: true });
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); shown.remove(); hide.remove(); };
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

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/team');
  }

  function openSheet(value: Sheet) {
    Keyboard.dismiss();
    setSheet(value);
  }

  function editAvailability() {
    setTimes(Object.fromEntries(weekdays.map((day) => {
      const hours = member.availability.find((item) => item.day === day);
      return [day, { start: hours?.start ?? '', end: hours?.end ?? '' }];
    })));
    setTimesError('');
    openSheet('availability');
  }

  function setTime(day: string, key: 'start' | 'end', value: string) {
    setTimes((current) => ({ ...current, [day]: { ...current[day], [key]: value.trim() } }));
    setTimesError('');
  }

  async function saveAvailability() {
    const filled = weekdays.filter((day) => times[day]?.start || times[day]?.end);
    const invalid = filled.some((day) => !HHMM.test(times[day].start) || !HHMM.test(times[day].end) || times[day].start >= times[day].end);
    if (invalid) {
      setTimesError('Use 24-hour times like 09:00 and 17:00, with the start before the end. Leave both empty for days off.');
      return;
    }
    Keyboard.dismiss();
    if (await save({ availability: filled.map((day) => ({ day, ...times[day] })) })) setSheet(null);
  }

  async function addSkill() {
    const value = newSkill.trim();
    if (!value) return;
    Keyboard.dismiss();
    if (member.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setNewSkill('');
      return;
    }
    if (await save({ skills: [...member.skills, value] })) setNewSkill('');
  }

  function saveName() {
    if (name.trim() !== member.fullName) void save({ fullName: name.trim() });
  }

  function saveLocation() {
    if (location.trim() !== member.location) void save({ location: location.trim() });
  }

  async function confirmRemove() {
    if (removing) return;
    setRemoving(true);
    setError('');
    onRemoving(member);
    try {
      await removeMember(member.id);
      setSheet(null);
      goBack();
    } catch (e) {
      onRemoving(undefined);
      setRemoving(false);
      setError(errorMessage(e));
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to team" onPress={goBack} style={styles.backButton}>
            <Text aria-hidden style={styles.backArrow}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{member.fullName || member.email}</Text>
          <Text style={styles.email}>{member.fullName ? member.email : 'Invited, hasn’t joined yet'}</Text>
        </View>

        <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput accessibilityLabel="Member name" value={name} placeholder="Add name" placeholderTextColor="#999999" editable={!saving} maxLength={100} autoCapitalize="words" onFocus={() => { scrollToSkills.current = false; }} onChangeText={setName} onEndEditing={saveName} returnKeyType="done" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Role: ${roleLabels[member.role]}`} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => openSheet('role')} style={styles.inputRow}>
                <Text style={[styles.value, styles.fieldValue]}>{roleLabels[member.role]}</Text>
                <View aria-hidden style={styles.chevron} />
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput accessibilityLabel="Member location" value={location} placeholder="Add location" placeholderTextColor="#999999" editable={!saving} onFocus={() => { scrollToSkills.current = false; }} onChangeText={setLocation} onEndEditing={saveLocation} returnKeyType="done" style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Availability</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit availability: ${member.availability.map((item) => `${item.day} ${item.start} to ${item.end}`).join(', ') || 'Not set'}`} accessibilityState={{ disabled: saving }} disabled={saving} onPress={editAvailability} style={styles.inputRow}>
                <Text numberOfLines={1} style={[styles.value, styles.fieldValue]}>{availability || 'Add availability'}</Text>
                <Image source={require('@/assets/images/tabIcons/DotsThreeIcon.svg')} tintColor="#000000" style={styles.smallIcon} />
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Skills</Text>
              {member.skills.map((skill) => (
                <View key={skill} style={styles.inputRow}>
                  <Text style={[styles.value, styles.fieldValue]}>{skill}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${skill}`} accessibilityState={{ disabled: saving }} disabled={saving} onPress={() => save({ skills: member.skills.filter((item) => item !== skill) })} hitSlop={6} style={styles.iconButton}>
                    <Text aria-hidden style={styles.minus}>−</Text>
                  </Pressable>
                </View>
              ))}
              <View style={styles.inputRow}>
                <TextInput accessibilityLabel="Add skill" placeholder="Add skill" placeholderTextColor="#999999" value={newSkill} editable={!saving} onFocus={() => { scrollToSkills.current = true; }} onChangeText={setNewSkill} returnKeyType="done" onSubmitEditing={addSkill} style={styles.skillInput} />
                <Pressable accessibilityRole="button" accessibilityLabel="Add skill" disabled={!newSkill.trim() || saving} onPress={addSkill} hitSlop={6} style={styles.iconButton}>
                  <Text aria-hidden style={styles.plus}>＋</Text>
                </Pressable>
              </View>
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

        {!keyboardOpen && <View style={styles.actions}>
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
      {sheet === 'availability' && (
        <JobSelectionSheet title="Availability" onClose={() => { if (!saving) setSheet(null); }}>
          <Text style={styles.sheetText}>Working hours each day, in 24-hour time. Leave a day empty if they’re off.</Text>
          {weekdays.map((day) => (
            <View key={day} style={styles.hoursRow}>
              <Text style={[styles.value, styles.fieldValue]}>{day}</Text>
              <TextInput accessibilityLabel={`${day} start time`} placeholder="09:00" placeholderTextColor="#999999" keyboardType="numbers-and-punctuation" maxLength={5} value={times[day]?.start} onChangeText={(value) => setTime(day, 'start', value)} style={styles.hoursInput} />
              <Text aria-hidden style={styles.sheetText}>–</Text>
              <TextInput accessibilityLabel={`${day} end time`} placeholder="17:00" placeholderTextColor="#999999" keyboardType="numbers-and-punctuation" maxLength={5} value={times[day]?.end} onChangeText={(value) => setTime(day, 'end', value)} style={styles.hoursInput} />
            </View>
          ))}
          {timesError ? <Text accessibilityRole="alert" style={styles.error}>{timesError}</Text> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} disabled={saving} onPress={saveAvailability} style={[styles.actionButton, styles.darkButton, saving && styles.pressed]}>
            {saving && <ActivityIndicator size="small" color="#FFFFFF" />}
            <Text style={[styles.actionLabel, styles.whiteLabel]}>{saving ? 'Saving…' : 'Save availability'}</Text>
          </Pressable>
        </JobSelectionSheet>
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
  iconButton: { width: 28, minHeight: 38, justifyContent: 'center', alignItems: 'flex-end' },
  minus: { fontSize: 22, color: '#505050' },
  plus: { fontSize: 24, color: '#999999' },
  skillInput: { flex: 1, minWidth: 0, paddingVertical: 8, fontSize: 16, color: '#000000' },
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
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursInput: { width: 72, minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, padding: 10, color: '#000000', fontSize: 16, textAlign: 'center' },
  error: { color: '#C93838', fontSize: 13 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1 },
  pressed: { opacity: 0.7 },
});
