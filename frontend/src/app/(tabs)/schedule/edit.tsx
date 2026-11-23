import { Fonts } from '@/constants/fonts';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, icons } from '@/components/schedule/icons';
import { statuses, statusLabels } from '@/components/schedule/schedule-data';
import { Body, BORDER, Button, Field, InputBox, Screen, ScreenHeader, SelectBox } from '@/components/schedule/ui';
import { errorMessage, useJobs } from '@/context/jobs';
import { useMembers } from '@/context/members';
import { type Appointment, formatDate, formatDuration, formatTime, useAppointmentApi } from '@/lib/appointment-api';

// TODO: save functionality needs an update appointment endpoint. For now this only shows the real appointment
export default function EditAppointmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAppointment } = useAppointmentApi();
  const { jobs } = useJobs();
  const { members } = useMembers();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [status, setStatus] = useState<Appointment['status']>('Scheduled');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    getAppointment(id).then(
      (a) => { if (!stale) { setAppt(a); setStatus(a.status); } },
      (e) => { if (!stale) setError(errorMessage(e)); },
    );
    return () => { stale = true; };
  }, [getAppointment, id]);

  if (!appt) {
    return (
      <Screen>
        <ScreenHeader title="Edit Appointment" />
        <Body>
          <Text style={error ? styles.error : styles.time}>{error ?? 'Loading…'}</Text>
        </Body>
      </Screen>
    );
  }

  const job = jobs.find((j) => j.id === appt.jobId);
  const names = members.filter((m) => appt.assigneeIds.includes(m.id)).map((m) => m.fullName || m.email);

  return (
    <Screen>
      <ScreenHeader title="Edit Appointment" />
      <Body>
        <View style={{ gap: 12 }}>
          <Field label="Job*">
            <SelectBox value={job?.title ?? 'Unknown job'} />
          </Field>
          <Field label="Location*">
            <InputBox icon={icons.mapPin} value={job?.location || '-'} editable={false} style={styles.faded} />
          </Field>
          <Field label="Date & Time*">
            <View style={styles.dateBox}>
              <Icon xml={icons.calendarX} />
              <View>
                <Text style={styles.date}>{formatDate(appt.start)}</Text>
                <Text style={styles.time}>
                  {formatTime(appt.start)} - {formatTime(appt.end)} ({formatDuration(appt.start, appt.end)})
                </Text>
              </View>
            </View>
          </Field>
          <Field label="Assign workers*" helper={`${names.length} workers selected`}>
            <SelectBox value={names.join(', ')} placeholder="No one assigned" />
          </Field>
          <Field label="Notes">
            <InputBox defaultValue={appt.notes} placeholder="No notes" />
          </Field>
          <Field label="Status">
            <SelectBox
              value={statusLabels[status]}
              onPress={() => setStatus(statuses[(statuses.indexOf(status) + 1) % statuses.length])}
            />
          </Field>
        </View>
        <Button icon={icons.check} label="Save" onPress={() => router.back()} />
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  faded: { flex: 1, fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, paddingVertical: 8, color: 'rgba(0,0,0,0.4)' },
  dateBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  date: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 24, color: '#000000' },
  time: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 24, color: 'rgba(0,0,0,0.7)' },
  error: { fontFamily: Fonts.regular, fontSize: 14, color: '#DD3636' },
});
