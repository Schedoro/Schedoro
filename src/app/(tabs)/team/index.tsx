import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import TeamMemberRow from '@/components/team-member-row';
import InviteMemberDialog from '@/components/invite-member-dialog';
import { useProfile } from '@/context/profile';
import { useTeams } from '@/context/teams';

const sections = [
  { role: 'owner', label: 'Owner' },
  { role: 'manager', label: 'Managers' },
  { role: 'worker', label: 'Workers' },
] as const;

export default function TeamScreen() {
  const { profile } = useProfile();
  const { selectedTeam, teams } = useTeams();
  const team = selectedTeam ?? teams[0];
  const [inviteOpen, setInviteOpen] = useState(false);
  const [lastDraft, setLastDraft] = useState<{ teamId: string; email: string }>();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>Your Team</Text>
          <Text style={styles.description}>{team ? `${team.name}’s Schedoro members` : 'Your Schedoro members'}</Text>
        </View>

        {sections.map(({ role, label }, index) => {
          const members = team?.members.filter((member) => member.role === role) ?? [];
          return (
            <View key={role} style={[styles.section, index > 0 && styles.followingSection]}>
              <View style={styles.ownerLabel}>
                {role === 'owner' && <Image source={require('@/assets/images/OwnerIcon.svg')} tintColor="#999999" style={styles.ownerIcon} />}
                <Text style={styles.sectionLabel}>{label}</Text>
              </View>
              <View style={styles.members}>
                {members.length ? members.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    name={member.id === 'current-user' ? profile.fullName : member.fullName}
                    onPress={() => member.id === 'current-user'
                      ? router.navigate('/more/profile')
                      : router.navigate({ pathname: '/team/[memberId]', params: { memberId: member.id, teamId: team!.id } })}
                  />
                )) : <Text style={styles.emptyText}>None</Text>}
              </View>
            </View>
          );
        })}

        <Pressable accessibilityRole="button" onPress={() => setInviteOpen(true)} style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}>
          <Image source={require('@/assets/images/InviteMemberIcon.svg')} tintColor="#FFFFFF" style={styles.inviteIcon} />
          <Text style={styles.inviteLabel}>Invite member</Text>
        </Pressable>
        {lastDraft && lastDraft.teamId === team?.id && <Text accessibilityLiveRegion="polite" style={styles.draftStatus}>Invitation draft saved for {lastDraft.email}. Email has not been sent.</Text>}
      </ScrollView>
      {inviteOpen && team && <InviteMemberDialog teamId={team.id} onClose={() => setInviteOpen(false)} onDraftSaved={(email) => {
        setLastDraft({ teamId: team.id, email });
        setInviteOpen(false);
      }} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, paddingTop: 48, paddingBottom: 32 },
  heading: { alignItems: 'center', gap: 12, marginBottom: 32 },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8, color: '#000000', textAlign: 'center' },
  description: { fontSize: 16, lineHeight: 22, letterSpacing: -0.4, color: '#505050', textAlign: 'center' },
  ownerLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerIcon: { width: 16, height: 16 },
  sectionLabel: { fontSize: 16, lineHeight: 22, letterSpacing: -0.3, color: '#999999' },
  section: { gap: 12 },
  followingSection: { marginTop: 16 },
  members: { gap: 16 },
  emptyText: { fontSize: 16, lineHeight: 24, color: '#000000', letterSpacing: -0.3 },
  inviteButton: { minHeight: 44, marginTop: 24, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#171717', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  inviteIcon: { width: 16, height: 16 },
  inviteLabel: { fontSize: 16, lineHeight: 24, color: '#FFFFFF' },
  draftStatus: { marginTop: 12, fontSize: 14, lineHeight: 20, color: '#505050' },
  pressed: { opacity: 0.7 },
});
