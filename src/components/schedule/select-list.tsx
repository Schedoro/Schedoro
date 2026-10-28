import { Fonts } from '@/constants/fonts';

import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, icons } from './icons';
import { Body, Button, Checkbox, InputBox, Screen, ScreenHeader } from './ui';

type Item = { id: string; title: string; subtitle: string; avatar?: ReactNode };

// Shared by Select Jobs and Select Workers: includes search, an "All" row, one row per item, Apply button
export function SelectList({
  title,
  unit,
  searchPlaceholder,
  items,
  allAvatar,
}: {
  title: string;
  unit: string;
  searchPlaceholder: string;
  items: Item[];
  allAvatar?: ReactNode;
}) {
  const router = useRouter();
  const [all, setAll] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const shown = items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()));
  const count = all ? items.length : picked.length;

  const toggle = (id: string) => {
    setAll(false);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  return (
    <Screen>
      <ScreenHeader title={title} />
      <Body>
        <InputBox icon={icons.search} placeholder={searchPlaceholder} value={search} onChangeText={setSearch} />

        <View style={styles.list}>
          <Row
            checked={all}
            onPress={() => {
              setAll(!all);
              setPicked([]);
            }}
            title={`All ${unit}`}
            subtitle={`${items.length} ${unit}`}
            avatar={allAvatar}
          />
          {shown.map((item) => (
            <Row
              key={item.id}
              checked={!all && picked.includes(item.id)}
              onPress={() => toggle(item.id)}
              title={item.title}
              subtitle={item.subtitle}
              avatar={item.avatar}
            />
          ))}
        </View>

        <Button icon={icons.check} label={`Apply (${count} ${unit})`} onPress={() => router.back()} />
      </Body>
    </Screen>
  );
}

function Row({
  checked,
  onPress,
  title,
  subtitle,
  avatar,
}: {
  checked: boolean;
  onPress: () => void;
  title: string;
  subtitle: string;
  avatar?: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <Checkbox checked={checked} />
      {avatar}
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export function Initials({ initials, bg, fg }: { initials: string; bg: string; fg: string }) {
  return (
    <View style={[styles.avatar, styles.round, { backgroundColor: bg }]}>
      <Text style={[styles.initials, { color: fg }]}>{initials}</Text>
    </View>
  );
}

export function GroupAvatar() {
  return (
    <View style={[styles.avatar, styles.group]}>
      <Icon xml={icons.usersFour} size={20} />
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: Fonts.regular, fontSize: 16, color: '#000000' },
  subtitle: { fontFamily: Fonts.regular, fontSize: 14, color: 'rgba(0,0,0,0.4)' },
  avatar: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center' },
  round: { borderRadius: 25 },
  group: { borderRadius: 8, backgroundColor: 'rgba(229,229,229,0.5)' },
  initials: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 16 },
});
