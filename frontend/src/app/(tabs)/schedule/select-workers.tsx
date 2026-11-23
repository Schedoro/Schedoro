import { GroupAvatar, Initials, SelectList } from '@/components/schedule/select-list';
import { useMembers } from '@/context/members';
import { useScheduleSelection } from '@/context/schedule-selection';

const roleLabels = { owner: 'Owner', manager: 'Manager', worker: 'Worker' };

export default function SelectWorkersScreen() {
  const { members } = useMembers();
  const { memberIds, setMemberIds } = useScheduleSelection();
  const items = members.map((m) => {
    const name = m.fullName || m.email;
    return {
      id: m.id,
      title: name,
      subtitle: [roleLabels[m.role], m.skills.join(', ')].filter(Boolean).join('  ⋅ '),
      avatar: <Initials initials={name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()} bg={m.avatarColor} fg={m.initialsColor} />,
    };
  });

  return (
    <SelectList
      title="Select Workers"
      unit="workers"
      searchPlaceholder="Search workers..."
      allAvatar={<GroupAvatar />}
      items={items}
      initial={memberIds}
      onApply={setMemberIds}
    />
  );
}
