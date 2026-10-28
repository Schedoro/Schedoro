import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import MemberDetailsScreen from '@/components/member-details-screen';
import { useTeams } from '@/context/teams';

export default function TeamMemberProfileRoute() {
  const { memberId, teamId } = useLocalSearchParams<{ memberId: string; teamId?: string }>();
  const { teams, selectedTeam } = useTeams();
  const team = teamId ? teams.find((item) => item.id === teamId) : selectedTeam ?? teams[0];
  const member = team?.members.find((item) => item.id === memberId);

  if (member?.id === 'current-user') return <Redirect href="/more/profile" />;
  if (!member || !team) return (
    <View style={styles.empty}>
      <Text style={styles.title}>Member not found</Text>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/team')} style={styles.button}>
        <Text style={styles.buttonText}>Back to team</Text>
      </Pressable>
    </View>
  );
  return <MemberDetailsScreen key={`${team.id}-${member.id}`} teamId={team.id} member={member} />;
}

const styles = StyleSheet.create({
  empty: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 24 },
  title: { fontSize: 24, fontWeight: '600', color: '#171717' },
  button: { minHeight: 44, paddingHorizontal: 24, justifyContent: 'center', borderRadius: 8, backgroundColor: '#171717' },
  buttonText: { color: '#FFFFFF', fontSize: 16 },
});
