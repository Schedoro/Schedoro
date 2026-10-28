import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  options?: readonly string[];
  selected?: string[];
  multiple?: boolean;
  onSelect?: (value: string) => void;
  onClose: () => void;
  children?: ReactNode;
};

export default function JobSelectionSheet({ title, options = [], selected = [], multiple, onSelect, onClose, children }: Props) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close selection" onPress={onClose} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}>
              <Text style={styles.doneLabel}>Done</Text>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
            {options.map((option) => {
              const checked = selected.includes(option);
              return (
                <Pressable
                  key={option}
                  accessibilityRole={multiple ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked }}
                  onPress={() => onSelect?.(option)}
                  style={({ pressed }) => [styles.option, checked && styles.selected, pressed && styles.pressed]}>
                  <Text style={styles.optionLabel}>{option}</Text>
                  <Text aria-hidden style={styles.check}>{checked ? '✓' : ''}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.25)' },
  sheet: { width: '100%', maxWidth: 520, maxHeight: '80%', alignSelf: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 12, paddingTop: 12 },
  title: { flex: 1, fontSize: 20, fontWeight: '600', color: '#171717' },
  done: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  doneLabel: { fontSize: 16, color: '#5E5EFD', fontWeight: '600' },
  content: { padding: 24, paddingTop: 12, gap: 8 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  selected: { borderColor: '#5E5EFD', backgroundColor: '#F5F5FF' },
  optionLabel: { flex: 1, fontSize: 16, color: '#171717' },
  check: { width: 20, color: '#5E5EFD', fontSize: 18 },
  pressed: { opacity: 0.7 },
});
