import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import JobSelectionSheet from '@/components/job-selection-sheet';
import { type Job, jobTemplates, useJobs } from '@/context/jobs';

import { Fonts } from '@/constants/fonts';

const skillOptions = ['Regular cleaning', 'Deep Cleaning', 'Window cleaning', 'Laundry', 'Organizing'];
const durationOptions = ['30 min', '1h', '1.5h', '2h', '2.5h', '3h', '4h', '5h', '6h', '7h', '8h'];
const availabilityOptions = ['Weekdays, 9:00 AM – 5:00 PM', 'Weekday mornings, 9:00 AM – 12:00 PM', 'Weekday afternoons, 12:00 PM – 5:00 PM', 'Weekends, 9:00 AM – 5:00 PM'];
type Picker = 'name' | 'skills' | 'duration' | 'location' | 'availability';

function Chevron({ down = false }: { down?: boolean }) {
  return <View aria-hidden style={[styles.chevron, down && styles.chevronDown]} />;
}

function SelectionField({ label, placeholder, value, onPress, error }: {
  label: string; placeholder: string; value: string; onPress: () => void; error?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value || placeholder}`} onPress={onPress} style={[styles.inputRow, error && styles.invalid]}>
        <Text style={[styles.selectionText, !value && styles.placeholder]}>{value || placeholder}</Text>
        <Chevron />
      </Pressable>
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    </View>
  );
}

export default function JobForm({ job }: { job?: Job }) {
  const { addJob, updateJob } = useJobs();
  const [name, setName] = useState(job?.title ?? '');
  const [description, setDescription] = useState(job?.description ?? '');
  const [skills, setSkills] = useState<string[]>(job?.skills ?? []);
  const [duration, setDuration] = useState(job?.duration ?? '');
  const [location, setLocation] = useState(job?.location ?? '');
  const [availability, setAvailability] = useState<string[]>(job?.availability ?? []);
  const [picker, setPicker] = useState<Picker | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/jobs');
  }

  function openPicker(value: Picker) {
    Keyboard.dismiss();
    setPicker(value);
  }

  function toggle(values: string[], value: string) {
    return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  }

  function createJob() {
    setSubmitted(true);
    if (!name.trim() || !location.trim()) return;
    const values = { title: name.trim(), description: description.trim(), skills, duration, location: location.trim(), availability, category: job?.category ?? skills.join(', ') };
    if (job) updateJob(job.id, values);
    else addJob(values);
    Keyboard.dismiss();
    goBack();
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to jobs" onPress={goBack} style={styles.backButton}>
              <Text aria-hidden style={styles.backArrow}>←</Text>
            </Pressable>
            <Text accessibilityRole="header" style={styles.title}>{job ? 'Edit Job' : 'Create Job'}</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Job name*</Text>
              <View style={[styles.inputRow, submitted && !name.trim() && styles.invalid]}>
                <TextInput accessibilityLabel="Job name, required" placeholder="e.g. Clean Joe’s Office" placeholderTextColor="#999999" value={name} onChangeText={setName} style={styles.textInput} returnKeyType="next" />
                <Pressable accessibilityRole="button" accessibilityLabel="Choose a job template" onPress={() => openPicker('name')} style={styles.templateButton}>
                  <Chevron down />
                </Pressable>
              </View>
              {submitted && !name.trim() && <Text accessibilityRole="alert" style={styles.error}>Enter a job name.</Text>}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput accessibilityLabel="Description" multiline textAlignVertical="top" placeholder="Add a short description..." placeholderTextColor="#999999" value={description} onChangeText={setDescription} style={styles.descriptionInput} />
            </View>

            <SelectionField label="Skills required" placeholder="Select skills" value={skills.join(', ')} onPress={() => openPicker('skills')} />
            <SelectionField label="Duration" placeholder="Select duration" value={duration} onPress={() => openPicker('duration')} />
            <SelectionField label="Location*" placeholder="Add location" value={location} onPress={() => openPicker('location')} error={submitted && !location.trim() ? 'Enter a location.' : undefined} />
            <SelectionField label="Availability" placeholder="Select time ranges" value={availability.join('; ')} onPress={() => openPicker('availability')} />

            <Pressable accessibilityRole="button" onPress={createJob} style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <Image
                source={job ? require('@/assets/images/CheckmarkIcon.svg') : require('@/assets/images/tabIcons/SuitcaseIcon.svg')}
                tintColor="#FFFFFF"
                style={styles.suitcaseIcon}
              />
              <Text style={styles.createLabel}>{job ? 'Save' : 'Create'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {picker === 'name' && (
        <JobSelectionSheet title="Job templates" options={jobTemplates.map((job) => job.title)} selected={[name]} onClose={() => setPicker(null)} onSelect={(value) => {
          const template = jobTemplates.find((job) => job.title === value)!;
          setName(template.title); setDuration(template.duration); setSkills([template.category]); setPicker(null);
        }} />
      )}
      {picker === 'skills' && <JobSelectionSheet title="Skills required" options={[...new Set([...skillOptions, ...skills])]} selected={skills} multiple onSelect={(value) => setSkills((current) => toggle(current, value))} onClose={() => setPicker(null)} />}
      {picker === 'duration' && <JobSelectionSheet title="Duration" options={durationOptions} selected={[duration]} onSelect={(value) => { setDuration(value); setPicker(null); }} onClose={() => setPicker(null)} />}
      {picker === 'availability' && <JobSelectionSheet title="Availability" options={[...new Set([...availabilityOptions, ...availability])]} selected={availability} multiple onSelect={(value) => setAvailability((current) => toggle(current, value))} onClose={() => setPicker(null)} />}
      {picker === 'location' && (
        <JobSelectionSheet title="Location" onClose={() => setPicker(null)}>
          <TextInput autoFocus accessibilityLabel="Job location" placeholder="Enter an address or location" placeholderTextColor="#999999" value={location} onChangeText={setLocation} style={styles.locationInput} autoComplete="street-address" returnKeyType="done" onSubmitEditing={() => setPicker(null)} />
        </JobSelectionSheet>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingTop: 48, paddingBottom: 40 },
  header: { minHeight: 44, justifyContent: 'center', marginBottom: 32, paddingHorizontal: 56 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center' },
  backButton: { position: 'absolute', left: 12, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, lineHeight: 34, color: '#000000' },
  form: { paddingHorizontal: 38, gap: 12 },
  field: { gap: 6 },
  label: { fontSize: 16, lineHeight: 22, color: '#999999', letterSpacing: -0.3 },
  inputRow: { minHeight: 40, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput: { flex: 1, minWidth: 0, height: 38, paddingVertical: 0, fontSize: 16, color: '#171717', letterSpacing: -0.3 },
  templateButton: { minWidth: 32, minHeight: 38, alignItems: 'flex-end', justifyContent: 'center' },
  descriptionInput: { height: 86, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, fontSize: 16, lineHeight: 22, color: '#171717', letterSpacing: -0.3 },
  selectionText: { flex: 1, paddingVertical: 9, fontSize: 16, lineHeight: 21, color: '#171717', letterSpacing: -0.3 },
  placeholder: { color: '#999999' },
  chevron: { width: 10, height: 10, borderRightWidth: 1.5, borderTopWidth: 1.5, borderColor: '#000000', transform: [{ rotate: '45deg' }], marginRight: 4 },
  chevronDown: { transform: [{ rotate: '135deg' }], marginTop: -4 },
  createButton: { minHeight: 44, marginTop: 12, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#171717', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  suitcaseIcon: { width: 16, height: 16 },
  createLabel: { fontSize: 16, lineHeight: 24, color: '#FFFFFF' },
  locationInput: { minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, padding: 12, fontSize: 16, color: '#171717' },
  invalid: { borderColor: '#C93838' },
  error: { fontSize: 13, color: '#C93838' },
  pressed: { opacity: 0.7 },
});
