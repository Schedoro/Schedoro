import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';

import { Fonts } from '@/constants/fonts';
import { week } from './schedule-data';
import { PURPLE } from './ui';

export function WeekCalendar({ selected, onSelect, review = false }: {
  selected: number;
  onSelect: (date: number) => void;
  review?: boolean;
}) {
  return (
    <View style={styles.week}>
      {week.map((day) => (
        <Pressable
          key={day.date}
          accessibilityRole="button"
          accessibilityLabel={`October ${day.date}, 2026`}
          accessibilityState={{ selected: selected === day.date }}
          onPress={() => onSelect(day.date)}
          style={styles.day}>
          <Text style={styles.label}>{day.label}</Text>
          <View style={styles.date}>
            {(selected === day.date || (review && day.date >= 23)) && (
              <View style={[styles.circle, selected !== day.date && styles.lightCircle]} />
            )}
            <Text style={styles.number}>{day.date}</Text>
            {!review && selected !== day.date && (
              <View style={[styles.underline, { opacity: day.load }]} />
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 30 },
  day: { alignItems: 'center', gap: 8, minWidth: 33 },
  label: { fontSize: 15, lineHeight: 19, color: 'rgba(0,0,0,0.7)' },
  date: { width: 33, height: 33, alignItems: 'center', justifyContent: 'center' },
  circle: { position: 'absolute', inset: 0, borderRadius: 17, backgroundColor: PURPLE, opacity: 0.5 },
  lightCircle: { opacity: 0.25 },
  number: { fontFamily: Fonts.bold, fontSize: 16, lineHeight: 20, color: '#000000', includeFontPadding: false },
  underline: { position: 'absolute', bottom: 3, width: 18, height: 1, backgroundColor: PURPLE },
});
