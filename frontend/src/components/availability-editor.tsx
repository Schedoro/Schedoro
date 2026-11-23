import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

import { availabilitySummary, type WorkHours, weekdays } from '@/context/members';

import { Fonts } from '@/constants/fonts';

const dayNames: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// every half hour from 5 a.m. to 11:30 p.m., stored as 24-hour "HH:MM" like the backend
const times = Array.from({ length: 38 }, (_, i) => {
  const minutes = 5 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

// "17:30" -> "5:30 p.m.", short drops ":00" ("17:00" -> "5 p.m.") like the end times in the Figma modal
export function formatTime(time: string, short = false) {
  const [h, m] = time.split(':').map(Number);
  const minutes = short && m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
  return `${h % 12 || 12}${minutes} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

// "Monday: 9:00 a.m. - 5 p.m."
export function describeWindow(w: WorkHours) {
  return `${dayNames[w.day]}: ${formatTime(w.start)} - ${formatTime(w.end, true)}`;
}

const order = (w: WorkHours) => `${weekdays.indexOf(w.day)}-${w.start}`;
export const sortWindows = (windows: WorkHours[]) => [...windows].sort((a, b) => order(a).localeCompare(order(b)));

type FieldProps = {
  windows: WorkHours[];
  readOnly?: boolean;
  disabled?: boolean;
  // line under the modal title
  description?: string;
  // resolves to an error message to show in the editor, or null when it saved
  onSave: (windows: WorkHours[]) => Promise<string | null>;
};

// the one-line availability field from the member screen design, opens the editor below
export function AvailabilityField({ windows, readOnly, disabled, description, onSave }: FieldProps) {
  const [open, setOpen] = useState(false);
  const summary = availabilitySummary(windows);
  const label = sortWindows(windows).map(describeWindow).join(', ') || 'Not set';

  if (readOnly) {
    return <Text accessibilityLabel={`Availability: ${label}`} style={[styles.fieldValue, !summary && styles.placeholder]}>{summary || 'Not set'}</Text>;
  }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Edit availability: ${label}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => setOpen(true)} style={({ pressed }) => [styles.fieldRow, pressed && styles.pressed]}>
        <Text numberOfLines={1} style={[styles.fieldValue, !summary && styles.placeholder]}>{summary || 'Add availability'}</Text>
        <Image source={require('@/assets/images/tabIcons/DotsThreeIcon.svg')} tintColor="#000000" style={styles.dots} />
      </Pressable>
      {open && <AvailabilityEditor initial={windows} description={description} onSave={onSave} onClose={() => setOpen(false)} />}
    </>
  );
}

// thin line icons like the Phosphor minus/plus in Figma
function MinusIcon({ color = '#000000' }: { color?: string }) {
  return <View aria-hidden style={[styles.iconLine, { backgroundColor: color }]} />;
}

function PlusIcon({ color = '#000000' }: { color?: string }) {
  return (
    <View aria-hidden style={styles.icon}>
      <View style={[styles.iconLine, { backgroundColor: color }]} />
      <View style={[styles.iconLine, styles.iconLineVertical, { backgroundColor: color }]} />
    </View>
  );
}

type Draft = { days: string[]; start: string; end: string };

function AvailabilityEditor({ initial, description = 'Fill out your availability windows', onSave, onClose }: {
  initial: WorkHours[]; description?: string; onSave: FieldProps['onSave']; onClose: () => void;
}) {
  const [windows, setWindows] = useState(() => sortWindows(initial));
  const [adding, setAdding] = useState<Draft | null>(null);
  const [addError, setAddError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(windows) !== JSON.stringify(sortWindows(initial));

  function close() {
    if (!saving) onClose();
  }

  function remove(target: WorkHours) {
    setWindows((current) => current.filter((w) => w !== target));
    setError('');
  }

  function addWindows() {
    if (!adding) return;
    if (!adding.days.length) return setAddError('Pick at least one day.');
    if (adding.start >= adding.end) return setAddError('The end time has to be after the start time.');
    const clash = adding.days.find((day) => windows.some((w) => w.day === day && adding.start < w.end && w.start < adding.end));
    if (clash) return setAddError(`That overlaps a ${dayNames[clash]} window. Remove that one first.`);
    setWindows((current) => sortWindows([...current, ...adding.days.map((day) => ({ day, start: adding.start, end: adding.end }))]));
    setAdding(null);
    setAddError('');
    setError('');
  }

  function shiftTime(key: 'start' | 'end', step: number) {
    setAdding((current) => {
      if (!current) return current;
      const next = times[times.indexOf(current[key]) + step];
      return next ? { ...current, [key]: next } : current;
    });
    setAddError('');
  }

  async function save() {
    if (!changed || saving) return;
    setSaving(true);
    setError('');
    const message = await onSave(windows);
    setSaving(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close availability" onPress={close} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.dialog}>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>Availability</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Close availability" onPress={close} hitSlop={13} style={styles.closeButton}>
                <View aria-hidden style={styles.closeIcon}>
                  <View style={[styles.closeStroke, styles.closeForward]} />
                  <View style={[styles.closeStroke, styles.closeBackward]} />
                </View>
              </Pressable>
            </View>
            <Text style={styles.description}>{description}</Text>

            <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
              {windows.map((w) => (
                <View key={`${w.day}-${w.start}`} style={styles.row}>
                  <Text style={styles.rowText}>
                    <Text style={styles.rowDay}>{dayNames[w.day]}:</Text> {formatTime(w.start)} - {formatTime(w.end, true)}
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${describeWindow(w)}`} disabled={saving} onPress={() => remove(w)} hitSlop={12} style={styles.rowIcon}>
                    <MinusIcon />
                  </Pressable>
                </View>
              ))}

              {adding ? (
                <View style={styles.addForm}>
                  <Text style={styles.formLabel}>Days</Text>
                  <View style={styles.days}>
                    {weekdays.map((day) => {
                      const on = adding.days.includes(day);
                      return (
                        <Pressable
                          key={day}
                          accessibilityRole="checkbox"
                          accessibilityLabel={dayNames[day]}
                          accessibilityState={{ checked: on }}
                          onPress={() => { setAdding({ ...adding, days: on ? adding.days.filter((d) => d !== day) : [...adding.days, day] }); setAddError(''); }}
                          style={[styles.dayChip, on && styles.dayChipOn]}>
                          <Text style={[styles.dayLabel, on && styles.dayLabelOn]}>{day}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {(['start', 'end'] as const).map((key) => (
                    <View key={key} style={styles.stepperRow}>
                      <Text style={styles.formLabel}>{key === 'start' ? 'From' : 'To'}</Text>
                      <View style={styles.stepper}>
                        <Pressable accessibilityRole="button" accessibilityLabel={`${key === 'start' ? 'Start' : 'End'} 30 minutes earlier`} disabled={adding[key] === times[0]} onPress={() => shiftTime(key, -1)} style={styles.stepButton}>
                          <MinusIcon />
                        </Pressable>
                        <Text accessibilityLiveRegion="polite" style={styles.stepValue}>{formatTime(adding[key])}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={`${key === 'start' ? 'Start' : 'End'} 30 minutes later`} disabled={adding[key] === times[times.length - 1]} onPress={() => shiftTime(key, 1)} style={styles.stepButton}>
                          <PlusIcon />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                  {addError ? <Text accessibilityRole="alert" style={styles.error}>{addError}</Text> : null}
                  <View style={styles.formActions}>
                    <Pressable accessibilityRole="button" onPress={() => { setAdding(null); setAddError(''); }} style={({ pressed }) => [styles.button, styles.outlined, pressed && styles.pressed]}>
                      <Text style={styles.buttonLabel}>Cancel</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={addWindows} style={({ pressed }) => [styles.button, styles.dark, pressed && styles.pressed]}>
                      <Text style={[styles.buttonLabel, styles.lightLabel]}>Add</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel="Add availability" disabled={saving} onPress={() => setAdding({ days: [], start: '09:00', end: '17:00' })} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
                  <Text style={[styles.rowText, styles.placeholder]}>Add availability</Text>
                  <View style={styles.rowIcon}>
                    <PlusIcon color="#999999" />
                  </View>
                </Pressable>
              )}
            </ScrollView>

            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
            <View style={styles.footer}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={close} style={({ pressed }) => [styles.button, styles.outlined, pressed && styles.pressed]}>
                <Text style={styles.buttonLabel}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !changed || saving, busy: saving }}
                disabled={!changed || saving}
                onPress={save}
                style={({ pressed }) => [styles.button, changed ? styles.dark : styles.disabled, pressed && styles.pressed]}>
                {saving && <ActivityIndicator size="small" color="#FAFAFA" />}
                <Text style={[styles.buttonLabel, styles.lightLabel]}>{saving ? 'Saving…' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// sizes and colours from the "Availability" modal in Figma (232:368)
const styles = StyleSheet.create({
  fieldRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fieldValue: { flex: 1, fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  placeholder: { color: '#999999' },
  dots: { width: 18, height: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 340, maxHeight: '90%', borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF', padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontSize: 20, lineHeight: 24, fontFamily: Fonts.bold, letterSpacing: -0.4, color: '#0A0A0A' },
  closeButton: { width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
  closeStroke: { position: 'absolute', width: 14, height: 2, borderRadius: 1, backgroundColor: '#000000' },
  closeForward: { transform: [{ rotate: '45deg' }] },
  closeBackward: { transform: [{ rotate: '-45deg' }] },
  description: { fontSize: 16, lineHeight: 20, color: '#999999', letterSpacing: -0.3, marginTop: 4, marginBottom: 12 },
  list: { flexGrow: 0 },
  listContent: { gap: 6 },
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  rowText: { flex: 1, fontSize: 15, lineHeight: 20, color: '#000000', letterSpacing: -0.3 },
  rowDay: { fontFamily: Fonts.bold },
  rowIcon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  iconLine: { position: 'absolute', width: 14, height: 1.5, borderRadius: 1 },
  iconLineVertical: { transform: [{ rotate: '90deg' }] },
  addForm: { gap: 10, borderWidth: 1, borderColor: '#5E5EFD', borderRadius: 8, padding: 12 },
  formLabel: { fontSize: 14, lineHeight: 20, color: '#505050' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: { minWidth: 44, minHeight: 36, paddingHorizontal: 8, borderRadius: 18, borderWidth: 1, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' },
  dayChipOn: { borderColor: '#5E5EFD', backgroundColor: '#F5F5FF' },
  dayLabel: { fontSize: 14, color: '#171717' },
  dayLabelOn: { color: '#5E5EFD' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepButton: { width: 44, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5', alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 92, textAlign: 'center', fontSize: 15, color: '#000000' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 24 },
  button: { minHeight: 44, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  outlined: { borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF' },
  dark: { backgroundColor: '#171717' },
  disabled: { backgroundColor: '#A3A3A3' },
  buttonLabel: { fontSize: 16, lineHeight: 20, color: '#0A0A0A' },
  lightLabel: { color: '#FAFAFA' },
  error: { fontSize: 13, lineHeight: 18, color: '#C93838', marginTop: 8 },
  pressed: { opacity: 0.7 },
});
