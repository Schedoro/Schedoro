import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';

import { Icon, icons } from '@/components/schedule/icons';
import { BORDER, Button, PURPLE, ScreenHeader, useTopPadding } from '@/components/schedule/ui';
import { WeekCalendar } from '@/components/schedule/week-calendar';
import { Fonts } from '@/constants/fonts';
import { errorMessage, useJobs } from '@/context/jobs';
import { useMembers } from '@/context/members';
import { formatDuration, formatTime, toDateString, useAppointmentApi } from '@/lib/appointment-api';
import { type ProposedAppointment, type UnscheduledJob, useScheduleApi } from '@/lib/schedule-api';

// "a,b" -> ["a", "b"], missing means all
const toIds = (value?: string) => (value === undefined ? undefined : value.split(',').filter(Boolean));

function parseDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function ScheduleReviewScreen() {
  const router = useRouter();
  const { week, jobIds, memberIds } = useLocalSearchParams<{ week?: string; jobIds?: string; memberIds?: string }>();
  const { jobs } = useJobs();
  const { members } = useMembers();
  const { proposeSchedule } = useScheduleApi();
  const { createAppointment } = useAppointmentApi();
  const top = useTopPadding();

  const [proposals, setProposals] = useState<ProposedAppointment[]>([]);
  const [unscheduled, setUnscheduled] = useState<UnscheduledJob[]>([]);
  const [monday, setMonday] = useState(() => parseDate(week ?? toDateString(new Date())));
  const [selected, setSelected] = useState(monday.getDate());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    proposeSchedule(week ?? toDateString(new Date()), toIds(jobIds), toIds(memberIds)).then(
      (result) => {
        if (stale) return;
        const start = parseDate(result.weekStart);
        setMonday(start);
        setSelected(start.getDate());
        setProposals(result.proposals);
        setUnscheduled(result.unscheduled);
        setLoading(false);
      },
      (e) => { if (!stale) { setError(errorMessage(e)); setLoading(false); } },
    );
    return () => { stale = true; };
    // only generate once when the screen opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const selectedDay = weekDays.find((d) => d.getDate() === selected) ?? monday;
  const days = weekDays.map((d) => ({
    label: d.toLocaleDateString('en-US', { weekday: 'short' }),
    date: d.getDate(),
    load: proposals.some((p) => p.start.startsWith(toDateString(d))) ? 1 : 0, // underline days with proposals
  }));
  const today = proposals.filter((p) => p.start.startsWith(toDateString(selectedDay)));

  // save one at a time and drop each one once it's saved so a retry doesn't cause a double book
  async function confirm() {
    setSaving(true);
    setError(null);
    let remaining = proposals;
    try {
      for (const proposal of proposals) {
        await createAppointment({ ...proposal, notes: '' });
        remaining = remaining.filter((p) => p !== proposal);
        setProposals(remaining);
      }
      router.navigate('/schedule');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top }]}>
        <View style={styles.heading}>
          <ScreenHeader title="AI Schedule Review" />
          <Text style={styles.subtitle}>
            Here is your schedule for the week of{' '}
            <Text style={styles.bold}>{monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
          </Text>
        </View>
        <View style={styles.calendar}>
          <WeekCalendar
            days={days}
            monthName={selectedDay.toLocaleDateString('en-US', { month: 'long' })}
            year={selectedDay.getFullYear()}
            selected={selected}
            onSelect={setSelected}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {unscheduled.length > 0 && (
          <View style={styles.note}>
            <View style={styles.noteHeader}>
              <Text style={styles.noteTitle}>Couldn’t fit {unscheduled.length} {unscheduled.length === 1 ? 'job' : 'jobs'}</Text>
              <Pressable onPress={() => setUnscheduled([])} hitSlop={12} accessibilityLabel="Dismiss">
                <Text style={styles.noteClose}>✕</Text>
              </Pressable>
            </View>
            {unscheduled.map((u) => (
              <Text key={u.jobId} style={styles.noteText}>
                <Text style={styles.bold}>{jobs.find((j) => j.id === u.jobId)?.title ?? 'Unknown job'}:</Text> {u.reason}
              </Text>
            ))}
          </View>
        )}

        {loading ? (
          <Text style={styles.empty}>Generating schedule…</Text>
        ) : (
          <View style={styles.list}>
            {today.map((proposal, index) => {
              const job = jobs.find((j) => j.id === proposal.jobId);
              const [first, ...others] = proposal.assigneeIds.map((id) => members.find((m) => m.id === id));
              const name = first?.fullName || first?.email || '?';
              const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <View key={`${proposal.jobId}-${proposal.start}`} style={[styles.row, index < today.length - 1 && styles.rowBorder]}>
                  <View style={styles.times}>
                    <Text numberOfLines={1} style={styles.time}>{formatTime(proposal.start)}</Text>
                    <Text numberOfLines={1} style={styles.time}>{formatTime(proposal.end)}</Text>
                  </View>
                  <View style={styles.details}>
                    <View style={styles.line}>
                      <Text style={styles.faded}>{formatDuration(proposal.start, proposal.end)}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>AI generated</Text>
                        <Icon xml={icons.magicWandGreen} size={12} />
                      </View>
                    </View>
                    <View style={styles.line}>
                      <Text style={styles.job}>{job?.title ?? 'Unknown job'}</Text>
                      <View style={styles.assignees}>
                        <View style={[styles.avatar, { backgroundColor: first?.avatarColor ?? '#EEEEEE' }]}>
                          <Text style={[styles.initials, { color: first?.initialsColor ?? '#000000' }]}>{initials}</Text>
                        </View>
                        {others.length > 0 && <Text style={styles.extra}>+{others.length}</Text>}
                      </View>
                    </View>
                    <Text style={styles.faded}>{job?.location}</Text>
                  </View>
                </View>
              );
            })}
            {today.length === 0 && !error && <Text style={styles.empty}>No appointments this day</Text>}
          </View>
        )}
      </ScrollView>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button icon={icons.magicWand} label="AI edit" color={PURPLE} onPress={() => router.navigate('/schedule/generate')} />
        </View>
        <View style={styles.action}>
          <Button icon={icons.check} label={saving ? 'Saving…' : 'Confirm'} onPress={saving || loading ? undefined : confirm} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingBottom: 24 },
  heading: { marginBottom: 32 },
  subtitle: { fontSize: 16, lineHeight: 20, textAlign: 'center', color: 'rgba(0,0,0,0.7)', marginTop: -20, paddingHorizontal: 16 },
  bold: { fontFamily: Fonts.bold },
  calendar: { marginBottom: 16 },
  error: { color: '#DD3636', fontSize: 14, textAlign: 'center', marginBottom: 12, paddingHorizontal: 16 },
  note: { marginHorizontal: 16, marginBottom: 12, padding: 12, gap: 4, borderRadius: 8, backgroundColor: 'rgba(253,160,94,0.15)' },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteTitle: { fontFamily: Fonts.bold, fontSize: 14, color: '#974002' },
  noteClose: { fontSize: 14, color: '#974002' },
  noteText: { fontSize: 14, lineHeight: 18, color: '#974002' },
  list: { paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 16, paddingVertical: 12, minHeight: 110 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  times: { minWidth: 72, flexShrink: 0, justifyContent: 'space-between' },
  time: { fontSize: 14, lineHeight: 17, color: 'rgba(0,0,0,0.7)' },
  details: { flex: 1, justifyContent: 'space-between', gap: 4 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, minHeight: 23 },
  faded: { fontSize: 14, lineHeight: 17, color: 'rgba(0,0,0,0.4)' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#E1FFE6', borderRadius: 12 },
  badgeText: { fontSize: 12, lineHeight: 15, color: '#02971B' },
  job: { flex: 1, fontSize: 16, lineHeight: 20, color: '#000000' },
  assignees: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12, lineHeight: 15 },
  extra: { fontSize: 14, color: '#000000' },
  empty: { fontSize: 16, textAlign: 'center', color: 'rgba(0,0,0,0.4)', paddingVertical: 48 },
  actions: { flexDirection: 'row', gap: 4, paddingTop: 12, paddingBottom: 20, paddingHorizontal: 4, width: '82%', maxWidth: 400, alignSelf: 'center' },
  action: { flex: 1 },
});
