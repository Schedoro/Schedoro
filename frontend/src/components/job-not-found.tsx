import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';

import { Fonts } from '@/constants/fonts';

// so opening a job before the list loads doesn't flash "Job not found"
export function JobLoading() {
  return (
    <View style={styles.screen}>
      <ActivityIndicator accessibilityLabel="Loading job" color="#171717" />
    </View>
  );
}

export default function JobNotFound({ title = 'Job not found', message }: { title?: string; message?: string | null }) {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/jobs')} style={styles.button}>
        <Text style={styles.label}>Back to jobs</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 24 },
  title: { color: '#171717', fontSize: 24, fontFamily: Fonts.medium, textAlign: 'center' },
  message: { color: '#505050', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  button: { backgroundColor: '#171717', borderRadius: 8, minHeight: 44, justifyContent: 'center', paddingHorizontal: 24 },
  label: { color: '#FFFFFF', fontSize: 16 },
});
