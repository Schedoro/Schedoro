import { Fonts } from '@/constants/fonts';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Icon, icons } from '@/components/schedule/icons';
import { appointments, statuses, statusLabels, workers } from '@/components/schedule/schedule-data';
import { Body, BORDER, Button, Field, InputBox, Screen, ScreenHeader, SelectBox } from '@/components/schedule/ui';

export default function EditAppointmentScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appt = appointments.find((a) => a.id === id) ?? appointments[1];
  const [status, setStatus] = useState(appt.status);
  const names = workers.filter((w) => appt.workerIds.includes(w.id)).map((w) => w.title);

  return (
    <Screen>
      <ScreenHeader title="Edit Appointment" />
      <Body>
        <View style={{ gap: 12 }}>
          <Field label="Job*">
            <SelectBox value={appt.job} onPress={() => router.push('/schedule/select-jobs')} />
          </Field>
          <Field label="Location*">
            <InputBox icon={icons.mapPin} defaultValue={appt.location} style={styles.faded} />
          </Field>
          <Field label="Date & Time*">
            <View style={styles.dateBox}>
              <Icon xml={icons.calendarX} />
              <View>
                <Text style={styles.date}>Friday, Oct {appt.date}, 2026</Text>
                <Text style={styles.time}>
                  {appt.start} - {appt.end} ({appt.duration})
                </Text>
              </View>
            </View>
          </Field>
          <Field label="Assign workers*" helper={`${names.length} workers selected`}>
            <SelectBox value={names.join(', ')} onPress={() => router.push('/schedule/select-workers')} />
          </Field>
          <Field label="Notes">
            <InputBox defaultValue={appt.notes} />
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
});
