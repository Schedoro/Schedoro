import { Fonts } from '@/constants/fonts';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, icons } from '@/components/schedule/icons';
import { appointments, statusLabels, workers } from '@/components/schedule/schedule-data';
import { Body, Screen, ScreenHeader } from '@/components/schedule/ui';

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appt = appointments.find((a) => a.id === id) ?? appointments[1];
  const names = workers.filter((w) => appt.workerIds.includes(w.id)).map((w) => w.title);

  return (
    <Screen>
      <ScreenHeader title="Appointment Details" />
      <Body>
        <View style={{ gap: 12 }}>
          <Detail label="Job" value={appt.job} />
          <Detail label="Location" value={appt.location} />
          <View style={styles.detail}>
            <Text style={styles.label}>Date & Time*</Text>
            <View style={{ gap: 2 }}>
              <Text style={styles.value}>Friday, Oct {appt.date}, 2026</Text>
              <Text style={styles.time}>
                {appt.start} - {appt.end} ({appt.duration})
              </Text>
            </View>
          </View>
          <Detail label={`Workers ( ${names.length} )`} value={names.join(', ')} />
          <Detail label="Notes" value={appt.notes || '-'} />
          <Detail label="Status" value={statusLabels[appt.status]} />
        </View>

        <View style={styles.buttons}>
          <Pressable onPress={() => router.back()} style={[styles.button, styles.delete]}>
            <Icon xml={icons.trash} />
            <Text style={styles.deleteText}>Delete</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/schedule/edit', params: { id: appt.id } })}
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
