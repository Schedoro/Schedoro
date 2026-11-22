import { useAuth } from '@clerk/expo';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';

import MemberDetailsScreen from '@/components/member-details-screen';
import { type TeamMember, useMembers } from '@/context/members';

import { Fonts } from '@/constants/fonts';

export default function TeamMemberProfileRoute() {
  const { memberId } = useLocalSearchParams<{ memberId: string }>();
  const { members, status, error } = useMembers();
  const { userId } = useAuth();
  // keeps the member on screen while removing, otherwise "Member not found" flashes before going back
  const [removing, setRemoving] = useState<TeamMember>();
  const member = members.find((item) => item.id === memberId) ?? removing;

  if (member && member.userId === userId) return <Redirect href="/more/profile" />; // your own details live on the profile screen
  if (member) return <MemberDetailsScreen key={member.id} member={member} onRemoving={setRemoving} />;
  if (status === 'loading') return (
    <View style={styles.empty}>
      <ActivityIndicator accessibilityLabel="Loading member" color="#171717" />
    </View>
  );
  return (
    <View style={styles.empty}>
      <Text style={styles.title}>{status === 'error' ? 'Couldn’t load the team' : 'Member not found'}</Text>
      {status === 'error' && error ? <Text style={styles.message}>{error}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/team')} style={styles.button}>
        <Text style={styles.buttonText}>Back to team</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  title: { fontSize: 24, fontFamily: Fonts.medium, color: '#171717', textAlign: 'center' },
  message: { fontSize: 16, lineHeight: 22, color: '#505050', textAlign: 'center' },
  button: { minHeight: 44, paddingHorizontal: 24, justifyContent: 'center', borderRadius: 8, backgroundColor: '#171717' },
  buttonText: { color: '#FFFFFF', fontSize: 16 },
});
