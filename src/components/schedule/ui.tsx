import { Fonts } from '@/constants/fonts';

import { useRouter } from 'expo-router';
import { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type TextInputProps } from 'react-native';
import { Text, TextInput } from '@/components/typography';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, icons } from './icons';

export const PURPLE = '#5E5EFD';
export const DARK = '#171717';
export const BORDER = '#E5E5E5';

// margin above the page title to allow space for phone's status bar
export function useTopPadding() {
  return Math.max(useSafeAreaInsets().top + 12, 48);
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: useTopPadding() }]}>
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
        <Icon xml={icons.arrowLeft} width={40} height={38} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

export function Body({ children }: { children: ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

export function Field({ label, helper, children }: { label: string; helper?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export function SelectBox({ value, placeholder, onPress }: { value?: string; placeholder?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.box, styles.selectBox]}>
      <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Icon xml={icons.caret} size={14} />
    </Pressable>
  );
}

export function InputBox({ icon, multiline, ...props }: TextInputProps & { icon?: string }) {
  return (
    <View style={[styles.box, styles.inputBox, multiline && styles.multilineBox]}>
      {icon ? <Icon xml={icon} /> : null}
      <TextInput
        placeholderTextColor="rgba(0,0,0,0.4)"
        multiline={multiline}
        style={[styles.value, styles.input]}
        {...props}
      />
    </View>
  );
}

export function Button({
  label,
  icon,
  color = DARK,
  onPress,
}: {
  label: string;
  icon: string;
  color?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.button, { backgroundColor: color }, pressed && styles.pressed]}>
      <Icon xml={icon} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.checkbox, checked && styles.checkboxOn]}>
      {checked ? <Icon xml={icons.checkSmall} size={14} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingBottom: 32, maxWidth: 480, width: '100%', alignSelf: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  back: { position: 'absolute', left: 10, top: 1 },
  title: { fontSize: 28, fontFamily: Fonts.bold, color: '#000000', textAlign: 'center' },
  body: { paddingHorizontal: 38, gap: 24 },
  field: { gap: 6 },
  label: { fontSize: 16, lineHeight: 24, color: 'rgba(0,0,0,0.4)' },
  helper: { fontSize: 14, lineHeight: 24, color: 'rgba(0,0,0,0.7)' },
  box: { borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingHorizontal: 12, minHeight: 40 },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  multilineBox: { alignItems: 'flex-start', paddingVertical: 8 },
  value: { flex: 1, fontSize: 16, lineHeight: 24, color: '#000000' },
  placeholder: { color: 'rgba(0,0,0,0.4)' },
  input: { paddingVertical: 8 },
  button: {
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 16, color: '#FAFAFA' },
  pressed: { opacity: 0.8 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: PURPLE, borderColor: PURPLE },
});
