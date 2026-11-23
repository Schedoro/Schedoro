import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
 
import JobSelectionSheet from '@/components/job-selection-sheet';
import { icons } from '@/components/schedule/icons';
import { Body, Button, Checkbox, Field, InputBox, Screen, ScreenHeader, SelectBox } from '@/components/schedule/ui';
import { Text } from '@/components/typography';
import { errorMessage, useJobs } from '@/context/jobs';
import { useMembers } from '@/context/members';
import { toDateString, useAppointmentApi } from '@/lib/appointment-api';
 
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
 
export default function CreateAppointmentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const { jobs } = useJobs();
  const { members } = useMembers();
  const { createAppointment } = useAppointmentApi();
 
  const [jobId, setJobId] = useState<string>();
  const [date, setDate] = useState(params.date ?? toDateString(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [workerIds, setWorkerIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [sheet, setSheet] = useState<'job' | 'workers' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const job = jobs.find((j) => j.id === jobId);
  const workerNames = members.filter((m) => workerIds.includes(m.id)).map((m) => m.fullName || m.email);
 
  const toggleWorker = (id: string) =>
    setWorkerIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
 
  async function onSave() {
    if (!jobId) return setError('Select a job.');
    if (!DATE.test(date)) return setError('Enter the date as YYYY-MM-DD.');
    if (!TIME.test(startTime) || !TIME.test(endTime)) return setError('Enter times as HH:MM, e.g. 09:00 or 14:30.');
    if (endTime <= startTime) return setError('End time must be after start time.');
    if (workerIds.length === 0) return setError('Assign at least one worker.');
 
    setSaving(true);
    setError(null);
    try {
      await createAppointment({
        jobId,
        assigneeIds: workerIds,
        start: `${date}T${startTime}:00`,
        end: `${date}T${endTime}:00`,
        notes: notes.trim(),
      });
      router.back(); // Schedule reloads when it comes back into view
    } catch (e) {
      setError(errorMessage(e)); // e.g. "Worker already booked at that time"
    } finally {
      setSaving(false);
    }
  }
 
  return (
    <Screen>
      <ScreenHeader title="Create Appointment" />
      <Body>
        <View style={{ gap: 12 }}>
          <Field label="Job*">
            <SelectBox value={job?.title} placeholder="Select job" onPress={() => setSheet('job')} />
          </Field>
          <Field label="Location">
            <InputBox icon={icons.mapPin} value={job?.location || ''} placeholder="Comes from the job" editable={false} />
          </Field>
          <Field label="Date*" helper="YYYY-MM-DD">
            <InputBox icon={icons.calendarXLight} value={date} onChangeText={setDate} placeholder="2026-11-23" />
          </Field>
          <View style={styles.row}>
            <View style={styles.half}>
              <Field label="Start*" helper="HH:MM">
                <InputBox value={startTime} onChangeText={setStartTime} placeholder="09:00" />
              </Field>
            </View>
            <View style={styles.half}>
              <Field label="End*" helper="HH:MM">
                <InputBox value={endTime} onChangeText={setEndTime} placeholder="13:00" />
              </Field>
            </View>
          </View>
          <Field label="Assign workers*" helper={`${workerIds.length} workers selected`}>
            <SelectBox value={workerNames.join(', ')} placeholder="Select workers" onPress={() => setSheet('workers')} />
          </Field>
          <Field label="Notes">
            <InputBox value={notes} onChangeText={setNotes} placeholder="Add notes (optional)..." multiline />
          </Field>
        </View>
 
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button icon={icons.plusSmall} label={saving ? 'Creating…' : 'Create'} onPress={saving ? undefined : onSave} />
      </Body>
 
      {sheet === 'job' ? (
        <JobSelectionSheet title="Select job" onClose={() => setSheet(null)}>
          {jobs.length === 0 ? <Text style={styles.empty}>No jobs yet. Add one in the Jobs tab first.</Text> : null}
          {jobs.map((j) => (
            <JobOption
              key={j.id}
              selected={j.id === jobId}
              title={j.title}
              subtitle={[j.duration, j.location].filter(Boolean).join(' ⋅ ')}
              onPress={() => {
                setJobId(j.id);
                setSheet(null);
              }}
            />
          ))}
        </JobSelectionSheet>
      ) : null}
 
      {sheet === 'workers' ? (
        <JobSelectionSheet title="Select workers" onClose={() => setSheet(null)}>
          {members.map((m) => (
            <PickRow
              key={m.id}
              checked={workerIds.includes(m.id)}
              title={m.fullName || m.email}
              subtitle={`${m.role} ⋅ ${m.skills.join(', ')}`}
              onPress={() => toggleWorker(m.id)}
            />
          ))}
        </JobSelectionSheet>
      ) : null}
    </Screen>
  );
}
 
// one job per appointment, so this looks like the app's other single-choice pickers
// (bordered option, purple when picked) instead of the worker checkboxes
function JobOption({ selected, title, subtitle, onPress }: { selected: boolean; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.pickTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pickSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      <Text aria-hidden style={styles.check}>{selected ? '✓' : ''}</Text>
    </Pressable>
  );
}

function PickRow({ checked, title, subtitle, onPress }: { checked: boolean; title: string; subtitle: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.pick}>
      <Checkbox checked={checked} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pickTitle}>{title}</Text>
        <Text style={styles.pickSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}
 
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  error: { color: '#DD3636', fontSize: 14, textAlign: 'center' },
  empty: { color: 'rgba(0,0,0,0.4)', fontSize: 14, paddingVertical: 12 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  pickTitle: { fontSize: 16, color: '#000000' },
  pickSubtitle: { fontSize: 14, color: 'rgba(0,0,0,0.4)' },
  // same as the options in components/job-selection-sheet.tsx
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  optionSelected: { borderColor: '#5E5EFD', backgroundColor: '#F5F5FF' },
  check: { width: 20, color: '#5E5EFD', fontSize: 18 },
  pressed: { opacity: 0.7 },
});
 