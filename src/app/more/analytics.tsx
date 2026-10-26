import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Hard-coded sample data for tthe analytics page for now
const metrics = [
  { label: 'Worker Utilization', value: '78%' },
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

const hoursPerWorker = [
  { name: 'Anya', hours: 14, color: '#5E5EFD' },
  { name: 'Aleks', hours: 10, color: '#A5A5F7' },
  { name: 'Aryana', hours: 6, color: '#DADAF0' },
];

const PURPLE = '#5E5EFD';
const maxJobs = Math.max(...jobsPerDay.map((d) => d.jobs));
const totalHours = hoursPerWorker.reduce((sum, w) => sum + w.hours, 0);

// Build one pie slice path per worker (radius 50, centre 50,50)
const pieSlices = (() => {
  let angle = -Math.PI / 2;
  return hoursPerWorker.map((w) => {
    const sweep = (w.hours / totalHours) * 2 * Math.PI;
    const x1 = 50 + 50 * Math.cos(angle);
    const y1 = 50 + 50 * Math.sin(angle);
    angle += sweep;
    const x2 = 50 + 50 * Math.cos(angle);
    const y2 = 50 + 50 * Math.sin(angle);
    const largeArc = sweep > Math.PI ? 1 : 0;
    return { ...w, d: `M50,50 L${x1},${y1} A50,50 0 ${largeArc} 1 ${x2},${y2} Z` };
  });
})();

export default function AnalyticsScreen() {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>Team scheduling performance</Text>

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

      <Text style={styles.sectionTitle}>Hours per Worker</Text>
      <View style={styles.chartBox}>
        <View style={styles.pieRow}>
          <Svg width={100} height={100} viewBox="0 0 100 100">
            {pieSlices.map((slice) => (
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
  title: { fontSize: 30, fontWeight: '700', textAlign: 'center', color: '#000000' },
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
  cardValue: { fontSize: 22, fontWeight: '700', marginTop: 6, color: '#000000' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8, color: '#000000' },
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
});
