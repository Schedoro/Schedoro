import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TeamMember } from '@/context/teams';

type Props = { member: TeamMember; name: string; onPress?: () => void };

export default function TeamMemberRow({ member, name, onPress }: Props) {
  const initials = name.trim().split(/\s+/).filter(Boolean)
    .filter((_, index, names) => index === 0 || index === names.length - 1)
    .map((part) => Array.from(part)[0]).join('').toLocaleUpperCase();
  const moreIcon = <Image source={require('@/assets/images/tabIcons/DotsThreeIcon.svg')} tintColor="#000000" style={styles.moreIcon} />;

  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`View ${name}’s profile`} onPress={onPress} hitSlop={{ top: 6, bottom: 6 }} style={({ pressed }) => [styles.profileLink, pressed && styles.pressed]}>
        <View aria-hidden style={[styles.avatar, { backgroundColor: member.avatarColor }]}>
          <Text style={[styles.initials, { color: member.initialsColor }]}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
      </Pressable>
      {onPress ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${name}’s profile`} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
          {moreIcon}
        </Pressable>
      ) : <View style={styles.more}>{moreIcon}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  profileLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12 },
  name: { flex: 1, fontSize: 16, lineHeight: 22, letterSpacing: -0.3, color: '#000000' },
  more: { width: 32, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  moreIcon: { width: 20, height: 20 },
  pressed: { opacity: 0.7 },
});
