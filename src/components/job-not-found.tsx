import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function JobNotFound() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>Job not found</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/jobs')} style={styles.button}>
        <Text style={styles.label}>Back to jobs</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', padding: 32, gap: 24 },
  title: { color: '#171717', fontSize: 24, fontWeight: '600' },
  button: { backgroundColor: '#171717', borderRadius: 8, minHeight: 44, justifyContent: 'center', paddingHorizontal: 24 },
  label: { color: '#FFFFFF', fontSize: 16 },
});
