import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import JobNotFound from '@/components/job-not-found';
import JobSelectionSheet from '@/components/job-selection-sheet';
import { useJobs } from '@/context/jobs';

import { Fonts } from '@/constants/fonts';

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'Not provided'}</Text>
    </View>
  );
}

function formatDuration(value: string) {
  const hours = value.match(/^(\d+(?:\.\d+)?)h$/);
  return hours ? `${hours[1]} ${Number(hours[1]) === 1 ? 'hour' : 'hours'}` : value;
}

export default function JobDetailsScreen() {
  const { id, options } = useLocalSearchParams<{ id: string; options?: string }>();
  const { jobs, deleteJob } = useJobs();
  const job = jobs.find((item) => item.id === id);
  const [sheet, setSheet] = useState<'options' | 'delete' | null>(options === 'true' ? 'options' : null);

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/jobs');
  }

  function editJob() {
    setSheet(null);
    router.push({ pathname: '/jobs/edit', params: { id } });
  }

  if (!job) return <JobNotFound />;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to jobs" onPress={goBack} style={styles.backButton}>
            <Text aria-hidden style={styles.backArrow}>←</Text>
          </Pressable>
          <Text accessibilityRole="header" style={styles.title}>Job Details</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.summary}>
            <View style={styles.iconBackground}>
              <Image source={require('@/assets/images/tabIcons/SuitcaseIcon.svg')} tintColor="#000000" style={styles.suitcaseIcon} />
            </View>
            <View style={styles.summaryText}>
              <Text style={styles.jobName}>{job.title}</Text>
              <Text style={styles.subtitle}>{[job.duration, job.category].filter(Boolean).join(' · ')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="More job options" onPress={() => setSheet('options')} style={styles.moreButton}>
              <Image source={require('@/assets/images/tabIcons/DotsThreeIcon.svg')} tintColor="#000000" style={styles.moreIcon} />
            </Pressable>
          </View>

          <View style={styles.details}>
            <Detail label="Description" value={job.description} />
            <Detail label="Skills required" value={job.skills.join(', ')} />
            <Detail label="Duration" value={formatDuration(job.duration)} />
            <Detail label="Location" value={job.location} />
            <Detail label="Availability" value={job.availability.join(', ')} />
          </View>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setSheet('delete')} style={({ pressed }) => [styles.actionButton, styles.deleteButton, pressed && styles.pressed]}>
              <Image source={require('@/assets/images/TrashIcon.svg')} tintColor="#F53238" style={styles.actionIcon} />
              <Text style={[styles.actionLabel, styles.deleteLabel]}>Delete</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={editJob} style={({ pressed }) => [styles.actionButton, styles.editButton, pressed && styles.pressed]}>
              <Image source={require('@/assets/images/PencilIcon.svg')} tintColor="#FFFFFF" style={styles.actionIcon} />
              <Text style={[styles.actionLabel, styles.editLabel]}>Edit</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {sheet === 'options' && (
        <JobSelectionSheet title="Job options" options={['Edit job', 'Delete job']} onClose={() => setSheet(null)} onSelect={(value) => value === 'Edit job' ? editJob() : setSheet('delete')} />
      )}
      {sheet === 'delete' && (
        <JobSelectionSheet title="Delete job?" onClose={() => setSheet(null)}>
          <Text style={styles.value}>Delete “{job.title}” from your job templates?</Text>
          <View style={styles.confirmActions}>
            <Pressable accessibilityRole="button" onPress={() => setSheet(null)} style={[styles.actionButton, styles.cancelButton]}>
              <Text style={styles.actionLabel}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setSheet(null); deleteJob(job.id); goBack(); }} style={[styles.actionButton, styles.deleteButton]}>
              <Text style={[styles.actionLabel, styles.deleteLabel]}>Delete</Text>
            </Pressable>
          </View>
        </JobSelectionSheet>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingTop: 48, paddingBottom: 40 },
  header: { minHeight: 44, justifyContent: 'center', marginBottom: 40, paddingHorizontal: 56 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center' },
  backButton: { position: 'absolute', left: 12, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 28, lineHeight: 34, color: '#000000' },
  body: { paddingHorizontal: 38 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  iconBackground: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#EEEEEE', alignItems: 'center', justifyContent: 'center' },
  suitcaseIcon: { width: 20, height: 20 },
  summaryText: { flex: 1, gap: 3 },
  jobName: { fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 20, color: '#999999', letterSpacing: -0.3 },
  moreButton: { width: 32, minHeight: 44, alignSelf: 'flex-start', alignItems: 'flex-end', justifyContent: 'center' },
  moreIcon: { width: 20, height: 20 },
  details: { gap: 16 },
  detail: { gap: 6 },
  label: { fontSize: 16, lineHeight: 21, color: '#999999', letterSpacing: -0.3 },
  value: { fontSize: 16, lineHeight: 20, color: '#000000', letterSpacing: -0.3 },
  actions: { flexDirection: 'row', gap: 4, marginTop: 24 },
  actionButton: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteButton: { borderWidth: 2, borderColor: '#F53238' },
  editButton: { backgroundColor: '#171717' },
  actionLabel: { fontSize: 16, lineHeight: 22, color: '#171717' },
  deleteLabel: { color: '#F53238' },
  editLabel: { color: '#FFFFFF' },
  actionIcon: { width: 18, height: 18 },
  confirmActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelButton: { backgroundColor: '#EEEEEE' },
  pressed: { opacity: 0.7 },
});
