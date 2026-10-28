import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function MoreScreen() {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Link href="/more/analytics" asChild>
        <Pressable
          accessibilityRole="link"
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: colors.backgroundElement, opacity: pressed ? 0.6 : 1 },
          ]}>
          <Text style={[styles.label, { color: colors.text }]}>Analytics</Text>
          <Text
            aria-hidden={true}
            style={[styles.chevron, { color: colors.textSecondary }]}>
            ›
          </Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    width: '100%',
    maxWidth: 480,
    minHeight: 60,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { fontSize: 16, fontWeight: '500' },
  chevron: { fontSize: 28, lineHeight: 32 },
});
