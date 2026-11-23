import { Fonts } from '@/constants/fonts';
 
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
 
import { Icon, icons } from '@/components/schedule/icons';
import { statusLabels } from '@/components/schedule/schedule-data';
import { Body, Screen, ScreenHeader } from '@/components/schedule/ui';
import { errorMessage, useJobs } from '@/context/jobs';
import { useMembers } from '@/context/members';
import { type Appointment, formatDate, formatDuration, formatTime, useAppointmentApi } from '@/lib/appointment-api';
 
export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAppointment } = useAppointmentApi();
  const { jobs } = useJobs();
  const { members } = useMembers();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    let stale = false;
    getAppointment(id).then(
      (a) => { if (!stale) setAppt(a); },
      (e) => { if (!stale) setError(errorMessage(e)); },
    );
    return () => { stale = true; };
  }, [getAppointment, id]);
 
  if (!appt) {
    return (
      <Screen>
        <ScreenHeader title="Appointment Details" />
        <Body>
          <Text style={error ? styles.error : styles.label}>{error ?? 'Loading…'}</Text>
        </Body>
      </Screen>
    );
  }
 
  const job = jobs.find((j) => j.id === appt.jobId);
  const names = members.filter((m) => appt.assigneeIds.includes(m.id)).map((m) => m.fullName || m.email);
 
  return (
    <Screen>
      <ScreenHeader title="Appointment Details" />
      <Body>
        <View style={{ gap: 12 }}>
          <Detail label="Job" value={job?.title ?? 'Unknown job'} />
          <Detail label="Location" value={job?.location || '-'} />
          <View style={styles.detail}>
            <Text style={styles.label}>Date & Time*</Text>
            <View style={{ gap: 2 }}>
              <Text style={styles.value}>{formatDate(appt.start)}</Text>
              <Text style={styles.time}>
                {formatTime(appt.start)} - {formatTime(appt.end)} ({formatDuration(appt.start, appt.end)})
              </Text>
            </View>
          </View>
          <Detail label={`Workers ( ${appt.assigneeIds.length} )`} value={names.join(', ') || appt.assigneeIds.join(', ')} />
          <Detail label="Notes" value={appt.notes || '-'} />
          <Detail label="Status" value={statusLabels[appt.status]} />
        </View>
 
        <View style={styles.buttons}>
          <Pressable onPress={() => router.back()} style={[styles.button, styles.delete]}>
            <Icon xml={icons.trash} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/schedule/edit', params: { id: appt.appointmentId } })}
            style={[styles.button, styles.edit]}>
            <Icon xml={icons.pencil} />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
      </Body>
    </Screen>
  );
}
 
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
 
const styles = StyleSheet.create({
  detail: { gap: 6 },
  error: { fontFamily: Fonts.regular, fontSize: 16, color: '#DD3636' },
  label: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: 'rgba(0,0,0,0.4)' },
  value: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: '#000000' },
  time: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 24, color: 'rgba(0,0,0,0.7)' },
  buttons: { flexDirection: 'row', gap: 4 },
  button: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  delete: { borderWidth: 2, borderColor: '#DD3636' },
  deleteText: { fontFamily: Fonts.regular, fontSize: 16, color: '#DD3636' },
  edit: { backgroundColor: '#171717' },
  editText: { fontFamily: Fonts.regular, fontSize: 16, color: '#FAFAFA' },
});
 