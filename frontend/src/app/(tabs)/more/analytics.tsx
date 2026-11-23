import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';
import Svg, { Path } from 'react-native-svg';
 
import { Fonts } from '@/constants/fonts';
import { errorMessage } from '@/context/jobs';
import { useMembers } from '@/context/members';
import { type UtilizationMetric, useAnalyticsApi } from '@/lib/analytics-api';
import { toDateString } from '@/lib/appointment-api';
 
// Sample data for the metrics that aren't built yet. Worker Utilization comes from the API.
const sampleMetrics = [
  { label: 'Avg Job Duration', value: '3.5h' },
  { label: 'Avg Travel Time', value: '22 min' },
  { label: 'Busiest Day', value: 'Wed' },
];
 
const jobsPerDay = [
  { day: 'Mon', jobs: 4 },
  { day: 'Tue', jobs: 6 },
  { day: 'Wed', jobs: 8 },
  { day: 'Thu', jobs: 5 },
  { day: 'Fri', jobs: 3 },
];
 
const PURPLE = '#5E5EFD';
const sliceColors = ['#5E5EFD', '#A5A5F7', '#DADAF0', '#7C7CF9', '#C2C2F4', '#3E3ED6'];
const maxJobs = Math.max(...jobsPerDay.map((d) => d.jobs));
 
type WorkerHours = { name: string; hours: number; color: string };
 
// Build one pie slice path per worker (radius 50, centre 50,50)
function pieSlices(hoursPerWorker: WorkerHours[]) {
  const totalHours = hoursPerWorker.reduce((sum, w) => sum + w.hours, 0);
  let angle = -Math.PI / 2;
  return hoursPerWorker.map((w) => {
    // a full circle can't be drawn as one arc, so stop just short of it
    const sweep = Math.min((w.hours / totalHours) * 2 * Math.PI, 2 * Math.PI - 0.0001);
    const x1 = 50 + 50 * Math.cos(angle);
    const y1 = 50 + 50 * Math.sin(angle);
    angle += sweep;
    const x2 = 50 + 50 * Math.cos(angle);
    const y2 = 50 + 50 * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    return { ...w, d: `M50,50 L${x1},${y1} A50,50 0 ${largeArc} 1 ${x2},${y2} Z` };
  });
}
 
// this week, Monday to Sunday
function thisWeek() {
  const today = new Date();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return { start: toDateString(monday), end: toDateString(sunday) };
}
 
export default function AnalyticsScreen() {
  const { getUtilization } = useAnalyticsApi();
  const { members } = useMembers();
  const [utilization, setUtilization] = useState<UtilizationMetric[] | null>(null);
  const [error, setError] = useState<string | null>(null);
 
  // loadMetrics: reload whenever the screen comes into view
  useFocusEffect(
    useCallback(() => {
      let stale = false;
      const { start, end } = thisWeek();
      getUtilization(start, end).then(
        (list) => { if (!stale) { setUtilization(list); setError(null); } },
        (e) => { if (!stale) setError(errorMessage(e)); },
      );
      return () => { stale = true; };
    }, [getUtilization]),
  );
 
  const nameOf = (m: UtilizationMetric) =>
    members.find((member) => member.id === m.teamMemberId)?.fullName || m.name;
  const average = utilization?.length
    ? Math.round(utilization.reduce((sum, m) => sum + m.utilizationPercent, 0) / utilization.length)
    : null;
  const metrics = [
    { label: 'Worker Utilization', value: utilization ? (average === null ? '–' : `${average}%`) : '…' },
    ...sampleMetrics,
  ];
  const hoursPerWorker: WorkerHours[] = (utilization ?? [])
    .filter((m) => m.scheduledHours > 0)
    .map((m, i) => ({ name: nameOf(m), hours: m.scheduledHours, color: sliceColors[i % sliceColors.length] }));
 
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Team scheduling performance · this week</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
 
      <View style={styles.grid}>
        {metrics.map((m) => (
          <View key={m.label} style={styles.card}>
            <Text style={styles.cardLabel}>{m.label}</Text>
            <Text style={styles.cardValue}>{m.value}</Text>
          </View>
        ))}
      </View>
 
      <Text style={styles.sectionTitle}>Jobs per Day</Text>
      <View style={styles.chartBox}>
        <View style={styles.barRow}>
          {jobsPerDay.map((d) => (
            <View key={d.day} style={styles.barColumn}>
              <View style={[styles.bar, { height: (d.jobs / maxJobs) * 100 }]} />
              <Text style={styles.barLabel}>{d.day}</Text>
            </View>
          ))}
        </View>
      </View>
 
      <Text style={styles.sectionTitle}>Worker Utilization</Text>
      <View style={styles.chartBox}>
        {(utilization ?? []).length === 0 ? (
          <Text style={styles.legendText}>{utilization ? 'No appointments this week yet.' : 'Loading…'}</Text>
        ) : null}
        {(utilization ?? []).map((m) => (
          <View key={m.teamMemberId} style={styles.utilRow}>
            <Text style={styles.legendText}>
              {nameOf(m)} · {m.scheduledHours}h / {m.maxWeeklyHours}h
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(m.utilizationPercent, 100)}%` }]} />
            </View>
            <Text style={styles.percent}>{m.utilizationPercent}%</Text>
          </View>
        ))}
      </View>
 
      <Text style={styles.sectionTitle}>Hours per Worker</Text>
      <View style={styles.chartBox}>
        {hoursPerWorker.length === 0 ? <Text style={styles.legendText}>No hours scheduled this week yet.</Text> : null}
        <View style={styles.pieRow}>
          <Svg width={100} height={100} viewBox="0 0 100 100">
            {pieSlices(hoursPerWorker).map((slice) => (
              <Path key={slice.name} d={slice.d} fill={slice.color} />
            ))}
          </Svg>
          <View style={styles.legend}>
            {hoursPerWorker.map((w) => (
              <View key={w.name} style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: w.color }]} />
                <Text style={styles.legendText}>
                  {w.name} {w.hours}h
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingTop: 20, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 30, fontFamily: Fonts.bold, textAlign: 'center', color: '#000000' },
  subtitle: { fontSize: 14, color: '#666666', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  cardLabel: { fontSize: 12, color: '#777777' },
  cardValue: { fontSize: 22, fontFamily: Fonts.bold, marginTop: 6, color: '#000000' },
  sectionTitle: { fontSize: 16, fontFamily: Fonts.bold, marginTop: 24, marginBottom: 8, color: '#000000' },
  chartBox: { borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 12, padding: 16 },
  barRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130 },
  barColumn: { alignItems: 'center' },
  bar: { width: 24, borderRadius: 4, backgroundColor: PURPLE },
  barLabel: { fontSize: 11, color: '#777777', marginTop: 6 },
  pieRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  legend: { marginLeft: 24 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { fontSize: 13, color: '#333333' },
  error: { color: '#DD3636', fontSize: 14, textAlign: 'center', marginBottom: 12 },
  utilRow: { marginBottom: 12, gap: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: '#EEEEFB', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: PURPLE },
  percent: { fontSize: 12, color: '#777777', textAlign: 'right' },
});
 