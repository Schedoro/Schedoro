import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';

import { Icon, icons } from '@/components/schedule/icons';
import { appointments, workers } from '@/components/schedule/schedule-data';
import { BORDER, Button, PURPLE, ScreenHeader, useTopPadding } from '@/components/schedule/ui';
import { WeekCalendar } from '@/components/schedule/week-calendar';
import { Fonts } from '@/constants/fonts';

const previewDetails = [
  { worker: workers[0], extra: 2, generated: true, duration: '4 hours' },
  { worker: workers[1], extra: 1, generated: true, duration: '3 hours' },
  { worker: workers[2], extra: 0, generated: false, duration: '2 hours' },
  { worker: workers[3], extra: 1, generated: true, duration: '15 minutes' },
];

export default function ScheduleReviewScreen() {
  const router = useRouter();
  const { range } = useLocalSearchParams<{ range?: string }>();
  const [selected, setSelected] = useState(23);
  const top = useTopPadding();
  const today = appointments.filter((appointment) => appointment.date === selected);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: top }]}>
        <View style={styles.heading}>
          <ScreenHeader title="AI Schedule Review" />
          <Text style={styles.subtitle}>
            Here is your schedule for the <Text style={styles.bold}>next {range ?? '30 days'}</Text>
          </Text>
        </View>
        <View style={styles.calendar}>
          <WeekCalendar selected={selected} onSelect={setSelected} review />
          <View style={styles.nextWeek} pointerEvents="none">
            <Icon xml={icons.caret} size={14} />
          </View>
        </View>
        <View style={styles.list}>
          {today.map((appointment, index) => {
            const { worker, extra, generated, duration } = previewDetails[index];
            return (
              <View key={appointment.id} style={[styles.row, index < today.length - 1 && styles.rowBorder]}>
                <View style={styles.times}>
                  <Text numberOfLines={1} style={styles.time}>{appointment.start}</Text>
                  <Text numberOfLines={1} style={styles.time}>{appointment.end}</Text>
                </View>
                <View style={styles.details}>
                  <View style={styles.line}>
                    <Text style={styles.faded}>{duration}</Text>
                    {generated && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>AI generated</Text>
                        <Icon xml={icons.magicWandGreen} size={12} />
                      </View>
                    )}
                  </View>
                  <View style={styles.line}>
                    <Text style={styles.job}>
                      {appointment.id === 'a3' ? 'Clean at Amy’s' : appointment.job}
                    </Text>
                    <View style={styles.assignees}>
                      <View style={[styles.avatar, { backgroundColor: worker.bg }]}>
                        <Text style={[styles.initials, { color: worker.fg }]}>{worker.initials}</Text>
                      </View>
                      {extra > 0 && <Text style={styles.extra}>+{extra}</Text>}
                      <Icon xml={icons.pencilBlack} size={20} />
                    </View>
                  </View>
                  <Text style={styles.faded}>{appointment.city}</Text>
                </View>
              </View>
            );
          })}
          {today.length === 0 && <Text style={styles.empty}>No appointments today</Text>}
        </View>
      </ScrollView>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button icon={icons.magicWand} label="AI edit" color={PURPLE} onPress={() => router.navigate('/schedule/generate')} />
        </View>
        <View style={styles.action}>
          <Button icon={icons.check} label="Confirm" onPress={() => router.navigate('/schedule')} />
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
  nextWeek: { position: 'absolute', right: 8, top: 26 },
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
  extra: { fontSize: 14, color: '#000000', marginRight: 6 },
  empty: { fontSize: 16, textAlign: 'center', color: 'rgba(0,0,0,0.4)', paddingVertical: 48 },
  actions: { flexDirection: 'row', gap: 4, paddingTop: 12, paddingBottom: 20, paddingHorizontal: 4, width: '82%', maxWidth: 400, alignSelf: 'center' },
  action: { flex: 1 },
});
