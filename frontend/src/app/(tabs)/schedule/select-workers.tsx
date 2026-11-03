import { workers } from '@/components/schedule/schedule-data';
import { GroupAvatar, Initials, SelectList } from '@/components/schedule/select-list';

export default function SelectWorkersScreen() {
  return (
    <SelectList
      title="Select Workers"
      unit="workers"
      searchPlaceholder="Search workers..."
      allAvatar={<GroupAvatar />}
      items={workers.map((w) => ({ ...w, avatar: <Initials initials={w.initials} bg={w.bg} fg={w.fg} /> }))}
    />
  );
}
