import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import TeamMemberRow from '@/components/team-member-row';
import InviteMemberDialog from '@/components/invite-member-dialog';
import TeamSettingsSheet from '@/components/team-settings-sheet';
import { useMembers } from '@/context/members';
import { useProfile } from '@/context/profile';
import { type Team, useTeams } from '@/context/teams';

import { Fonts } from '@/constants/fonts';

const currentUserColors = { avatarColor: '#A5F3FC', initialsColor: '#009DB4' }; // you're always cyan

const sections = [
  { role: 'owner', label: 'Owner' },
  { role: 'manager', label: 'Managers' },
  { role: 'worker', label: 'Workers' },
] as const;

export default function TeamScreen() {
  const { profile } = useProfile();
  const { userId } = useAuth();
  const { selectedTeam, teams } = useTeams();
  const { members: teamMembers, status, error, refresh } = useMembers();
  const team = selectedTeam ?? teams[0];
  const [inviteOpen, setInviteOpen] = useState(false);
  // remembers which team the sheet was opened for, so it doesn't switch teams while one is being deleted
  const [settingsFor, setSettingsFor] = useState<Team>();
  const settingsTeam = settingsFor && (teams.find((item) => item.id === settingsFor.id) ?? settingsFor);
  const [notice, setNotice] = useState('');

  // the confirmation goes away by itself after a few seconds
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);
  const canManage = team?.myRole === 'owner' || team?.myRole === 'manager';
  const [lastInvite, setLastInvite] = useState<{ teamId: string; email: string }>();
  const [refreshing, setRefreshing] = useState(false);

  async function reload() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>Your Team</Text>
          <Text style={styles.description}>{team ? `${team.name}’s Schedoro members` : 'Your Schedoro members'}</Text>
        </View>

        {notice ? (
          <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.successBanner}>
            <Image source={require('@/assets/images/CheckmarkIcon.svg')} tintColor="#15803D" style={styles.inviteIcon} />
            <Text style={styles.successText}>{notice}</Text>
          </View>
        ) : null}

        {error && !refreshing && (
          <View accessibilityRole="alert" style={styles.errorBanner}>
            <Text style={styles.errorText}>{status === 'ready' ? `Couldn’t refresh the team. ${error}` : error}</Text>
            <Pressable accessibilityRole="button" onPress={reload} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <Text style={styles.retryLabel}>Try again</Text>
            </Pressable>
          </View>
        )}

        {status === 'loading' && <ActivityIndicator accessibilityLabel="Loading team" color="#171717" style={styles.loading} />}

        {sections.map(({ role, label }, index) => {
          const members = teamMembers.filter((member) => member.role === role);
          return (
            <View key={role} style={[styles.section, index > 0 && styles.followingSection]}>
              <View style={styles.ownerLabel}>
                {role === 'owner' && <Image source={require('@/assets/images/OwnerIcon.svg')} tintColor="#999999" style={styles.ownerIcon} />}
                <Text style={styles.sectionLabel}>{label}</Text>
              </View>
              <View style={styles.members}>
                {members.map((member) => member.userId === userId ? (
                  <TeamMemberRow key={member.id} member={currentUserColors} name={profile.fullName || member.fullName || 'You'} onPress={() => router.navigate('/more/profile')} />
                ) : (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    name={member.fullName || member.email}
                    onPress={() => router.navigate({ pathname: '/team/[memberId]', params: { memberId: member.id } })}
                  />
                ))}
                {!members.length && status !== 'loading' && <Text style={styles.emptyText}>None</Text>}
              </View>
            </View>
          );
        })}

        {canManage && (
          <Pressable accessibilityRole="button" onPress={() => setInviteOpen(true)} style={({ pressed }) => [styles.inviteButton, pressed && styles.pressed]}>
            <Image source={require('@/assets/images/InviteMemberIcon.svg')} tintColor="#FFFFFF" style={styles.inviteIcon} />
            <Text style={styles.inviteLabel}>Invite member</Text>
          </Pressable>
        )}
        {team && canManage && (
          <Pressable accessibilityRole="button" accessibilityLabel={`Edit team ${team.name}`} onPress={() => setSettingsFor(team)} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <Image source={require('@/assets/images/PencilIcon.svg')} tintColor="#000000" style={styles.inviteIcon} />
            <Text style={styles.editLabel}>Edit team</Text>
          </Pressable>
        )}
        {lastInvite && lastInvite.teamId === team?.id && <Text accessibilityLiveRegion="polite" style={styles.draftStatus}>Invite sent to {lastInvite.email}. They’ll join the team when they sign up or sign in with that email.</Text>}
      </ScrollView>
      {settingsTeam && <TeamSettingsSheet team={settingsTeam} onClose={() => setSettingsFor(undefined)} onRenamed={(name) => {
        setSettingsFor(undefined);
        setNotice(`Team renamed to “${name}”.`);
      }} />}
      {inviteOpen && team && <InviteMemberDialog onClose={() => setInviteOpen(false)} onInvited={(email) => {
        setLastInvite({ teamId: team.id, email });
        setInviteOpen(false);
      }} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { width: '100%', maxWidth: 473, alignSelf: 'center', paddingHorizontal: 40, paddingTop: 48, paddingBottom: 32 },
  heading: { alignItems: 'center', gap: 12, marginBottom: 32 },
  title: { fontSize: 32, lineHeight: 40, fontFamily: Fonts.bold, letterSpacing: -0.8, color: '#000000', textAlign: 'center' },
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
  loading: { marginBottom: 16 },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 16, borderRadius: 8, borderWidth: 1, borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  successText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#15803D' },
  errorBanner: { gap: 8, padding: 12, marginBottom: 16, borderRadius: 8, borderWidth: 1, borderColor: '#F5C2C2', backgroundColor: '#FFF5F5' },
  errorText: { fontSize: 14, lineHeight: 20, color: '#C93838' },
  retryButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  retryLabel: { fontSize: 14, color: '#171717', textDecorationLine: 'underline' },
  // same outlined style as the secondary buttons on the member screen
  editButton: { minHeight: 44, marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  editLabel: { fontSize: 16, lineHeight: 24, color: '#000000' },
  pressed: { opacity: 0.7 },
});
