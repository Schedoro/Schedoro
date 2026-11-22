import { Fonts } from '@/constants/fonts';
 
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';
 
import { Icon, icons } from '@/components/schedule/icons';
import { errorMessage, useJobs } from '@/context/jobs';
import {
  type Appointment,
  type AppointmentStatus,
  formatDuration,
  formatTime,
  toDateString,
  useAppointmentApi,
} from '@/lib/appointment-api';
import { BORDER, Button, PURPLE, useTopPadding } from '@/components/schedule/ui';
import { WeekCalendar } from '@/components/schedule/week-calendar';
 
// Title colour and status icon for each appointment status
const statusStyle = (status: AppointmentStatus) => {
  if (status === 'Completed') return { color: '#02971B', icon: icons.checkCircle };
  if (status === 'In-Progress') return { color: '#028B97', icon: icons.circleDashed };
  return { color: '#000000', icon: icons.circle };
};
 
// Monday to Sunday around the given day
function weekOf(day: Date) {
  const monday = new Date(day.getFullYear(), day.getMonth(), day.getDate() - ((day.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}
 
export default function ScheduleScreen() {
  const router = useRouter();
  const { jobs } = useJobs();
  const { getAppointments } = useAppointmentApi();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);
  const top = useTopPadding();
 
  const week = weekOf(selectedDate);
  const days = week.map((d) => ({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), date: d.getDate(), load: 0 }));
  const dateString = toDateString(selectedDate);
 
  // reload every time the screen comes into view, e.g. after creating an appointment
  useFocusEffect(
    useCallback(() => {
      let stale = false;
      setLoading(true);
      getAppointments(dateString).then(
        (list) => { if (!stale) { setAppointments(list); setError(null); setLoading(false); } },
        (e) => { if (!stale) { setError(errorMessage(e)); setLoading(false); } },
      );
      return () => { stale = true; };
    }, [getAppointments, dateString]),
  );
 
  // shape each appointment for the list
  const today = appointments.map((a) => {
    const job = jobs.find((j) => j.id === a.jobId);
    return {
      id: a.appointmentId,
      job: job?.title ?? 'Unknown job',
      city: job?.location || '',
      start: formatTime(a.start),
      end: formatTime(a.end),
      duration: formatDuration(a.start, a.end),
      status: a.status,
    };
  });
 
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top }]}>
        <Text style={styles.month}>
          {selectedDate.toLocaleDateString('en-US', { month: 'long' })}{' '}
          <Text style={{ color: PURPLE }}>{selectedDate.getFullYear()}</Text>
        </Text>
 
        <WeekCalendar
          days={days}
          monthName={selectedDate.toLocaleDateString('en-US', { month: 'long' })}
          year={selectedDate.getFullYear()}
          selected={selectedDate.getDate()}
          onSelect={(n) => setSelectedDate(week.find((d) => d.getDate() === n) ?? selectedDate)}
        />
 
        {error ? <Text style={styles.error}>{error}</Text> : null}
 
        {loading ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : today.length > 0 ? (
          <View style={styles.list}>
            {today.map((a, i) => {
              const s = statusStyle(a.status);
              return (
                <Pressable
                  key={a.id}
                  onPress={() => router.push({ pathname: '/schedule/details', params: { id: a.id } })}
                  style={[styles.row, i < today.length - 1 && styles.rowBorder]}>
                  <View style={styles.times}>
                    <Text style={styles.time}>{a.start}</Text>
                    <Text style={styles.time}>{a.end}</Text>
                  </View>
                  <View style={styles.info}>
                    <Icon xml={icons.suitcase(s.color)} size={24} />
                    <View style={styles.infoText}>
                      <Text style={styles.faded}>
                        {a.start} - {a.end} ({a.duration})
                      </Text>
                      <View style={styles.titleRow}>
                        <Text style={[styles.job, { color: s.color }]}>{a.job}</Text>
                        <Icon xml={s.icon} size={20} />
                      </View>
                      <Text style={styles.faded}>{a.city}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon xml={icons.calendarBlank} size={48} />
            </View>
            <View style={styles.emptyText}>
              <Text style={styles.emptyTitle}>No appointments today</Text>
              <Text style={styles.emptyBody}>
                Generate an optimized schedule with AI using your jobs, workers, and constraints.
              </Text>
            </View>
            <View style={styles.emptyButtons}>
              <Button
                icon={icons.magicWand}
                label="Generate schedule"
                color={PURPLE}
                onPress={() => router.push('/schedule/generate')}
              />
              <Button icon={icons.plusSmall} label="Add appointment" onPress={() => router.push({ pathname: '/schedule/create', params: { date: dateString } })} />
            </View>
          </View>
        )}
      </ScrollView>
 
      {today.length > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Schedule actions" onPress={() => setActionsVisible(true)} style={styles.fab}>
          <Icon xml={icons.plus} size={20} />
        </Pressable>
      ) : null}
      <Modal transparent animationType="fade" visible={actionsVisible} onRequestClose={() => setActionsVisible(false)}>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close schedule actions" style={StyleSheet.absoluteFill} onPress={() => setActionsVisible(false)} />
          <View style={styles.popup} accessibilityViewIsModal>
            <Button
              icon={icons.magicWand}
              label="Generate schedule"
              color={PURPLE}
              onPress={() => {
                setActionsVisible(false);
                router.push('/schedule/generate');
              }}
            />
            <Button
              icon={icons.plusSmall}
              label="Add appointment"
              onPress={() => {
                setActionsVisible(false);
                router.push({ pathname: '/schedule/create', params: { date: dateString } });
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 120, maxWidth: 480, width: '100%', alignSelf: 'center' },
  error: { color: '#DD3636', fontSize: 14, textAlign: 'center', marginTop: 16, paddingHorizontal: 16 },
  loading: { color: 'rgba(0,0,0,0.4)', fontSize: 14, textAlign: 'center', marginTop: 48 },
  month: { fontSize: 32, fontFamily: Fonts.bold, textAlign: 'center', color: '#000000', marginBottom: 32 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', padding: 28 },
  popup: { width: '100%', maxWidth: 360, alignSelf: 'center', padding: 24, gap: 12, borderRadius: 16, backgroundColor: '#FFFFFF' },
  list: { marginTop: 24, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 16, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  times: { justifyContent: 'space-between' },
  time: { fontSize: 14, color: 'rgba(0,0,0,0.7)' },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { flex: 1, gap: 4 },
  faded: { fontSize: 14, color: 'rgba(0,0,0,0.4)' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  job: { fontSize: 16, fontFamily: Fonts.bold },
  empty: { alignItems: 'center', gap: 24, paddingTop: 64, paddingHorizontal: 16 },
  emptyIcon: { backgroundColor: '#F1F4F5', padding: 24, borderRadius: 50 },
  emptyText: { gap: 12, alignItems: 'center' },
  emptyTitle: { fontSize: 28, fontFamily: Fonts.bold, color: '#000000', textAlign: 'center' },
  emptyBody: { fontSize: 16, color: 'rgba(0,0,0,0.4)', textAlign: 'center' },
  emptyButtons: { gap: 12, alignSelf: 'stretch', marginHorizontal: 29 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 0px 4px rgba(0,0,0,0.25)',
  },
});
 