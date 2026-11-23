import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/typography';

import JobSelectionSheet from '@/components/job-selection-sheet';
import { useJobs } from '@/context/jobs';

// case-insensitive, keeps the first spelling it sees ("Deep cleaning" and "deep Cleaning" are one skill)
export function uniqueSkills(skills: string[]) {
  const seen = new Map<string, string>();
  for (const skill of skills) {
    const value = skill.trim();
    if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
  }
  return [...seen.values()];
}

// every skill used in the team's jobs, for the picker's options
export function useTeamSkills() {
  const { jobs } = useJobs();
  return useMemo(() => uniqueSkills(jobs.flatMap((job) => job.skills)).sort((a, b) => a.localeCompare(b)), [jobs]);
}

type Props = {
  title: string;
  selected: string[];
  onChange: (skills: string[]) => void;
  onClose: () => void;
};

// type to search or add a skill, tap options to pick several. options come from the team's jobs
export default function SkillPicker({ title, selected, onChange, onClose }: Props) {
  const teamSkills = useTeamSkills();
  const [query, setQuery] = useState('');
  const typed = query.trim();
  const isSelected = (skill: string) => selected.some((item) => item.toLowerCase() === skill.toLowerCase());

  const options = uniqueSkills([...selected, ...teamSkills])
    .filter((skill) => skill.toLowerCase().includes(typed.toLowerCase()));
  const canAdd = typed.length > 0 && !options.some((skill) => skill.toLowerCase() === typed.toLowerCase());

  function toggle(skill: string) {
    onChange(isSelected(skill) ? selected.filter((item) => item.toLowerCase() !== skill.toLowerCase()) : [...selected, skill]);
  }

  function addTyped() {
    if (!typed) return;
    const existing = options.find((skill) => skill.toLowerCase() === typed.toLowerCase());
    if (existing) {
      if (!isSelected(existing)) toggle(existing);
    } else {
      onChange([...selected, typed]);
    }
    setQuery('');
  }

  return (
    <JobSelectionSheet title={title} onClose={onClose}>
      <TextInput
        accessibilityLabel="Search or add a skill"
        placeholder="Search or add a skill"
        placeholderTextColor="#999999"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="sentences"
        autoCorrect={false}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={addTyped}
        maxLength={60}
        style={styles.input}
      />
      {canAdd && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Add skill ${typed}`} onPress={addTyped} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
          <Text style={styles.optionLabel}>Add “{typed}”</Text>
          <Text aria-hidden style={styles.plus}>＋</Text>
        </Pressable>
      )}
      {options.map((skill) => {
        const checked = isSelected(skill);
        return (
          <Pressable
            key={skill}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => toggle(skill)}
            style={({ pressed }) => [styles.option, checked && styles.selected, pressed && styles.pressed]}>
            <Text style={styles.optionLabel}>{skill}</Text>
            <Text aria-hidden style={styles.check}>{checked ? '✓' : ''}</Text>
          </Pressable>
        );
      })}
      {!options.length && !canAdd && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No skills yet. Type one above to add it.</Text>
        </View>
      )}
    </JobSelectionSheet>
  );
}

type FieldProps = {
  skills: string[];
  disabled?: boolean;
  onSave: (skills: string[]) => void;
};

// the Skills list from the member screen design: a row per skill with a minus, then "Add skill",
// which opens the picker. changes are saved once when the picker closes, not on every tap
export function SkillsField({ skills, disabled, onSave }: FieldProps) {
  const [draft, setDraft] = useState<string[] | null>(null);

  function close() {
    const changed = draft && (draft.length !== skills.length || draft.some((skill, i) => skill !== skills[i]));
    if (draft && changed) onSave(draft);
    setDraft(null);
  }

  return (
    <>
      {skills.map((skill) => (
        <View key={skill} style={styles.row}>
          <Text style={styles.rowValue}>{skill}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${skill}`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onSave(skills.filter((item) => item !== skill))} hitSlop={6} style={styles.rowButton}>
            <Text aria-hidden style={styles.minus}>−</Text>
          </Pressable>
        </View>
      ))}
      <Pressable accessibilityRole="button" accessibilityLabel="Add skill" accessibilityState={{ disabled }} disabled={disabled} onPress={() => setDraft(skills)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Text style={styles.rowPlaceholder}>Add skill</Text>
        <View style={styles.rowButton}>
          <Text aria-hidden style={styles.rowPlus}>＋</Text>
        </View>
      </Pressable>
      {draft && <SkillPicker title="Skills" selected={draft} onChange={setDraft} onClose={close} />}
    </>
  );
}

// options match the ones in job-selection-sheet.tsx, rows match the member screen fields
const styles = StyleSheet.create({
  row: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12 },
  rowValue: { flex: 1, fontSize: 16, lineHeight: 22, color: '#000000', letterSpacing: -0.3 },
  rowPlaceholder: { flex: 1, fontSize: 16, lineHeight: 22, color: '#999999', letterSpacing: -0.3 },
  rowButton: { width: 28, minHeight: 38, justifyContent: 'center', alignItems: 'flex-end' },
  minus: { fontSize: 22, color: '#505050' },
  rowPlus: { fontSize: 24, color: '#999999' },
  input: { minHeight: 44, borderWidth: 1, borderColor: '#E5E5E5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: '#171717', marginBottom: 4 },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E5E5' },
  selected: { borderColor: '#5E5EFD', backgroundColor: '#F5F5FF' },
  optionLabel: { flex: 1, fontSize: 16, color: '#171717' },
  check: { width: 20, color: '#5E5EFD', fontSize: 18 },
  plus: { width: 20, color: '#5E5EFD', fontSize: 20 },
  empty: { paddingVertical: 12 },
  emptyText: { fontSize: 14, color: '#999999' },
  pressed: { opacity: 0.7 },
});
