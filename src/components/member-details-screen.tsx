import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import JobSelectionSheet from '@/components/job-selection-sheet';
import { type TeamMember, useTeams } from '@/context/teams';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const roleLabels = { owner: 'Owner', manager: 'Manager', worker: 'Worker' } as const;
type Sheet = 'role' | 'availability' | 'remove' | 'remind-availability' | 'remind-skills' | null;

export default function MemberDetailsScreen({ teamId, member }: { teamId: string; member: TeamMember }) {
  const { updateMember, removeMember, saveReminderDraft } = useTeams();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [newSkill, setNewSkill] = useState('');
  const [status, setStatus] = useState('');
  const [hours, setHours] = useState<Record<string, string>>({});
  const [hoursError, setHoursError] = useState('');
  const availability = member.availability.map(({ day, hours: count }) =>
    `${day} ${Number.isInteger(count) && count >= 1 && count <= 20 ? String.fromCodePoint(0x245f + count) : count}`
  ).join(', ');

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/team');
  }

  function openSheet(value: Sheet) {
    Keyboard.dismiss();
    setSheet(value);
  }

  function editAvailability() {
    setHours(Object.fromEntries(weekdays.map((day) => [day, String(member.availability.find((item) => item.day === day)?.hours ?? 0)])));
    setHoursError('');
    openSheet('availability');
  }

  function saveAvailability() {
    if (weekdays.some((day) => !Number.isFinite(Number(hours[day])) || Number(hours[day]) < 0 || Number(hours[day]) > 24)) {
      setHoursError('Enter hours between 0 and 24 for each day.');
      return;
    }
    updateMember(teamId, member.id, { availability: weekdays.map((day) => ({ day, hours: Number(hours[day]) })).filter((item) => item.hours > 0) });
    Keyboard.dismiss();
    setSheet(null);
  }

  function addSkill() {
    const value = newSkill.trim();
    if (!value) return;
    if (!member.skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      updateMember(teamId, member.id, { skills: [...member.skills, value] });
    }
    setNewSkill('');
    Keyboard.dismiss();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to team" onPress={goBack} style={styles.backButton}>
            <Text aria-hidden style={styles.backArrow}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>{member.fullName}</Text>
          <Text style={styles.email}>{member.email}</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Role</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Role: ${roleLabels[member.role]}`} onPress={() => openSheet('role')} style={styles.inputRow}>
                <Text style={[styles.value, styles.fieldValue]}>{roleLabels[member.role]}</Text>
                <View aria-hidden style={styles.chevron} />
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput accessibilityLabel="Member location" value={member.location} placeholder="Add location" placeholderTextColor="#999999" onChangeText={(location) => updateMember(teamId, member.id, { location })} style={styles.input} />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Availability</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Edit availability: ${member.availability.map((item) => `${item.day} ${item.hours} hours`).join(', ') || 'Not set'}`} onPress={editAvailability} style={styles.inputRow}>
                <Text numberOfLines={1} style={[styles.value, styles.fieldValue]}>{availability || 'Add availability'}</Text>
                <Image source={require('@/assets/images/tabIcons/DotsThreeIcon.svg')} tintColor="#000000" style={styles.smallIcon} />
              </Pressable>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Skills</Text>
              {member.skills.map((skill) => (
                <View key={skill} style={styles.inputRow}>
                  <Text style={[styles.value, styles.fieldValue]}>{skill}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${skill}`} onPress={() => updateMember(teamId, member.id, { skills: member.skills.filter((item) => item !== skill) })} hitSlop={6} style={styles.iconButton}>
                    <Text aria-hidden style={styles.minus}>−</Text>
                  </Pressable>
                </View>
              ))}
              <View style={styles.inputRow}>
                <TextInput accessibilityLabel="Add skill" placeholder="Add skill" placeholderTextColor="#999999" value={newSkill} onChangeText={setNewSkill} returnKeyType="done" onSubmitEditing={addSkill} style={styles.skillInput} />
                <Pressable accessibilityRole="button" accessibilityLabel="Add skill" disabled={!newSkill.trim()} onPress={addSkill} hitSlop={6} style={styles.iconButton}>
                  <Text aria-hidden style={styles.plus}>＋</Text>
                </Pressable>
              </View>
            </View>

            {status ? <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text> : null}
          </View>
        </ScrollView>

        <View style={styles.actions}>
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
        </View>
      </KeyboardAvoidingView>

      {sheet === 'role' && (
        <JobSelectionSheet title="Role" options={Object.values(roleLabels)} selected={[roleLabels[member.role]]} onClose={() => setSheet(null)} onSelect={(label) => {
          const role = (Object.keys(roleLabels) as TeamMember['role'][]).find((key) => roleLabels[key] === label)!;
          updateMember(teamId, member.id, { role }); setSheet(null);
        }} />
      )}
      {sheet === 'availability' && (
        <JobSelectionSheet title="Availability" onClose={() => setSheet(null)}>
          <Text style={styles.sheetText}>Hours available each day. Use 0 for days off.</Text>
          {weekdays.map((day) => (
            <View key={day} style={styles.hoursRow}>
              <Text style={[styles.value, styles.fieldValue]}>{day}</Text>
              <TextInput accessibilityLabel={`${day} hours available`} keyboardType="decimal-pad" value={hours[day]} onChangeText={(value) => { setHours((current) => ({ ...current, [day]: value })); setHoursError(''); }} style={styles.hoursInput} />
              <Text style={styles.sheetText}>hours</Text>
            </View>
          ))}
          {hoursError ? <Text accessibilityRole="alert" style={styles.error}>{hoursError}</Text> : null}
          <Pressable accessibilityRole="button" onPress={saveAvailability} style={[styles.actionButton, styles.darkButton]}><Text style={[styles.actionLabel, styles.whiteLabel]}>Save availability</Text></Pressable>
        </JobSelectionSheet>
      )}
      {(sheet === 'remind-availability' || sheet === 'remind-skills') && (
        <JobSelectionSheet title="Reminder" onClose={() => setSheet(null)}>
          <Text style={styles.sheetText}>To: {member.email}</Text>
          <Text style={styles.value}>Please update your {sheet === 'remind-availability' ? 'availability' : 'skills'} in Schedoro.</Text>
          <Text style={styles.sheetText}>Save this as a draft. Email delivery is not connected yet.</Text>
          <Pressable accessibilityRole="button" onPress={() => {
            saveReminderDraft(teamId, member.id, sheet === 'remind-availability' ? 'availability' : 'skills');
            setStatus('Reminder draft saved. Email has not been sent.'); setSheet(null);
          }} style={[styles.actionButton, styles.darkButton]}><Text style={[styles.actionLabel, styles.whiteLabel]}>Save draft</Text></Pressable>
        </JobSelectionSheet>
      )}
      {sheet === 'remove' && (
        <JobSelectionSheet title="Remove member?" onClose={() => setSheet(null)}>
          <Text style={styles.value}>Remove {member.fullName} from this team?</Text>
          <View style={styles.confirmActions}>
            <Pressable accessibilityRole="button" onPress={() => setSheet(null)} style={[styles.actionButton, styles.outlinedButton, styles.confirmButton]}><Text style={styles.actionLabel}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setSheet(null); removeMember(teamId, member.id); goBack(); }} style={[styles.actionButton, styles.removeButton, styles.confirmButton]}><Text style={[styles.actionLabel, styles.whiteLabel]}>Remove</Text></Pressable>
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
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8, color: '#000000', textAlign: 'center', paddingHorizontal: 12 },
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
  sheetText: { color: '#505050', fontSize: 16, lineHeight: 22 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursInput: { width: 72, minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, padding: 10, color: '#000000', fontSize: 16, textAlign: 'center' },
  error: { color: '#C93838', fontSize: 13 },
  confirmActions: { flexDirection: 'row', gap: 12 },
  confirmButton: { flex: 1 },
  pressed: { opacity: 0.7 },
});
