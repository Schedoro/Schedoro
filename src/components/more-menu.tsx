import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTeams } from '@/context/teams';

const selectedColor = '#5E5EFD';
const items = [
  { label: 'Profile', icon: require('@/assets/images/tabIcons/ProfileIcon.svg') },
  { label: 'Analytics', icon: require('@/assets/images/tabIcons/AnalyticsIcon.svg') },
  { label: 'Switch teams', icon: require('@/assets/images/tabIcons/TeamIcon.svg') },
] as const;

export default function MoreMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<string>('Profile');
  const { resetTeams } = useTeams();

  function selectItem(label: string) {
    setSelected(label);
    if (label === 'Analytics') {
      onClose();
      router.navigate('/more/analytics');
    } else if (label === 'Switch teams') {
      onClose();
      router.replace('/teams');
    }
  }

  function signOut() {
    onClose();
    resetTeams();
    router.dismissAll();
    router.replace('/');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close More menu" onPress={onClose} style={StyleSheet.absoluteFill} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
          <View style={styles.sheet}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close More menu" onPress={onClose} style={styles.handleButton}>
              <View style={styles.handle} />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              <Text accessibilityRole="header" style={styles.title}>More</Text>
              {items.map(({ label, icon }) => {
                const isSelected = selected === label;
                const color = isSelected ? selectedColor : '#000000';
                return (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => selectItem(label)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                    <Image source={icon} tintColor={color} contentFit="contain" style={styles.icon} />
                    <Text style={[styles.label, { color }]}>{label}</Text>
                    <View aria-hidden style={styles.chevron} />
                  </Pressable>
                );
              })}
              <View style={styles.divider} />
              <Pressable accessibilityRole="button" onPress={signOut} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                <Image source={require('@/assets/images/tabIcons/SignOutIcon.svg')} tintColor="#000000" contentFit="contain" style={styles.icon} />
                <Text style={styles.label}>Sign out</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  safeArea: { width: '100%', maxWidth: 480, maxHeight: '85%', alignSelf: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheet: { flexShrink: 1, padding: 24 },
  content: { flexGrow: 1 },
  handleButton: { position: 'absolute', top: 0, alignSelf: 'center', width: 80, height: 32, alignItems: 'center', paddingTop: 10, zIndex: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D5D5D5' },
  title: { marginTop: 8, marginBottom: 8, fontSize: 22, lineHeight: 30, fontWeight: '700', letterSpacing: -0.5, color: '#000000' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 20, height: 20 },
  label: { flex: 1, fontSize: 16, lineHeight: 24, letterSpacing: -0.3, color: '#000000' },
  chevron: { width: 9, height: 9, marginRight: 4, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: '#999999', transform: [{ rotate: '45deg' }] },
  divider: { height: 1, backgroundColor: '#E5E5E5', marginTop: 8, marginBottom: 8 },
  pressed: { opacity: 0.6 },
});
