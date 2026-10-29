import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useJobs } from '@/context/jobs';

import { Fonts } from '@/constants/fonts';

const suitcaseIcon = require('@/assets/images/tabIcons/SuitcaseIcon.svg');
const moreIcon = require('@/assets/images/tabIcons/DotsThreeIcon.svg');
const searchIcon = require('@/assets/images/MagnifyingGlassIcon.svg');

export default function JobsScreen() {
  const { jobs } = useJobs();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const filteredJobs = jobs.filter((job) =>
    `${job.title} ${job.duration} ${job.category}`.toLocaleLowerCase().includes(query)
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <FlatList
        data={filteredJobs}
        keyExtractor={(job) => job.id}
        style={styles.list}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>Jobs</Text>
              <Text style={styles.description}>Job templates for scheduling appointments</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/jobs/create')}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <Image source={suitcaseIcon} tintColor="#FFFFFF" style={styles.createIcon} />
              <Text style={styles.createLabel}>Create job</Text>
            </Pressable>

            <View style={styles.searchField}>
              <Image source={searchIcon} style={styles.searchIcon} />
              <TextInput
                accessibilityLabel="Search jobs"
                placeholder="Search jobs..."
                placeholderTextColor="#999999"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={styles.searchInput}
              />
            </View>
          </>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.emptyText}>No jobs found.</Text>}
        renderItem={({ item }) => (
          <View style={styles.jobRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${item.title}`}
              onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: item.id } })}
              style={({ pressed }) => [styles.jobLink, pressed && styles.pressed]}>
              <View style={styles.jobIconBackground}>
                <Image source={suitcaseIcon} tintColor="#000000" style={styles.jobIcon} />
              </View>
              <View style={styles.jobDetails}>
                <Text style={styles.jobTitle}>{item.title}</Text>
                <Text style={styles.jobDescription}>{[item.duration, item.category].filter(Boolean).join(' · ')}</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`More options for ${item.title}`}
              onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: item.id, options: 'true' } })}
              style={({ pressed }) => [styles.moreButton, pressed && styles.pressed]}>
              <Image source={moreIcon} tintColor="#000000" style={styles.moreIcon} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  list: { flex: 1 },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, paddingBottom: 32 },
  heading: { paddingTop: 48, marginBottom: 30, alignItems: 'center', gap: 12 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center' },
  description: { fontSize: 16, lineHeight: 22, color: '#505050', textAlign: 'center', letterSpacing: -0.4 },
  createButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: '#171717' },
  createIcon: { width: 16, height: 16 },
  createLabel: { fontSize: 16, lineHeight: 24, color: '#FFFFFF' },
  searchField: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 16, marginBottom: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  searchIcon: { width: 16, height: 16 },
  searchInput: { flex: 1, minWidth: 0, height: 38, paddingVertical: 0, fontSize: 16, color: '#171717' },
  jobRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 72 },
  jobLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobIconBackground: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#EEEEEE', justifyContent: 'center', alignItems: 'center' },
  jobIcon: { width: 20, height: 20 },
  jobDetails: { flex: 1, gap: 3 },
  jobTitle: { fontSize: 16, lineHeight: 21, color: '#000000', letterSpacing: -0.4 },
  jobDescription: { fontSize: 14, lineHeight: 20, color: '#999999', letterSpacing: -0.3 },
  moreButton: { width: 32, minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', alignItems: 'flex-end' },
  moreIcon: { width: 20, height: 20 },
  separator: { height: 1, backgroundColor: '#E5E5E5' },
  emptyText: { paddingVertical: 24, fontSize: 14, color: '#999999', textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
