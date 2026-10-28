import { createContext, type ReactNode, useContext, useState } from 'react';

export type TeamMember = {
  id: string;
  fullName: string;
  role: 'owner' | 'manager' | 'worker';
  avatarColor: string;
  initialsColor: string;
  email: string;
  location: string;
  availability: { day: string; hours: number }[];
  skills: string[];
};

type MemberChanges = Partial<Pick<TeamMember, 'role' | 'location' | 'availability' | 'skills'>>;

type Team = { id: string; name: string; members: TeamMember[] };

export type InvitationRole = 'worker' | 'manager';
type InvitationDraft = { id: string; teamId: string; email: string; role: InvitationRole };
type ReminderDraft = { teamId: string; memberId: string; kind: 'availability' | 'skills' };

const currentUserOwner: TeamMember = {
  id: 'current-user', fullName: 'You', role: 'owner', avatarColor: '#A5F3FC', initialsColor: '#009DB4',
  email: '', location: '', availability: [], skills: [],
};

const sampleDetails = {
  location: '99 Oak Rd., Oakville, Ontario, Canada',
  availability: [{ day: 'Mon', hours: 8 }, { day: 'Tue', hours: 8 }, { day: 'Wed', hours: 6 }, { day: 'Thu', hours: 6 }, { day: 'Fri', hours: 8 }],
  skills: ['Regular cleaning', 'Deep cleaning'],
};

const initialTeams: Team[] = [
  {
    id: 'house-fairy', name: 'The House Fairy', members: [
      { ...sampleDetails, id: 'natalia', fullName: 'Natalia Popova', email: 'natalia.popova@example.com', role: 'owner', avatarColor: '#F5ADFF', initialsColor: '#A000BC' },
      { ...sampleDetails, id: 'current-user', fullName: 'Anya Popova', email: 'popovann@sheridancollege.ca', role: 'manager', avatarColor: '#A5F3FC', initialsColor: '#009DB4' },
      { ...sampleDetails, id: 'aryana', fullName: 'Aryana Kabir', email: 'aryana.kabir@example.com', role: 'manager', avatarColor: '#FFCEAE', initialsColor: '#A94B00' },
      { ...sampleDetails, id: 'aleksandar', fullName: 'Aleksandar Bursac', email: 'aleksandar.bursac@example.com', role: 'manager', avatarColor: '#D5FFA6', initialsColor: '#539400' },
      { ...sampleDetails, id: 'joe', fullName: 'Joe Smith', email: 'joe.smith@example.com', role: 'worker', avatarColor: '#FFADB2', initialsColor: '#BD0000' },
    ],
  },
  { id: 'pipe-whisperer', name: 'The Pipe Whisperer', members: [currentUserOwner] },
];

const TeamsContext = createContext<{
  teams: Team[];
  selectedTeam: Team | undefined;
  selectTeam: (id: string) => void;
  createTeam: (name: string) => Team;
  invitationDrafts: InvitationDraft[];
  addInvitationDraft: (teamId: string, email: string, role: InvitationRole) => void;
  updateMember: (teamId: string, memberId: string, changes: MemberChanges) => void;
  removeMember: (teamId: string, memberId: string) => void;
  reminderDrafts: ReminderDraft[];
  saveReminderDraft: (teamId: string, memberId: string, kind: ReminderDraft['kind']) => void;
  resetTeams: () => void;
} | null>(null);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState(initialTeams);
  const [selectedId, setSelectedId] = useState<string>();
  const [invitationDrafts, setInvitationDrafts] = useState<InvitationDraft[]>([]);
  const [reminderDrafts, setReminderDrafts] = useState<ReminderDraft[]>([]);

  function saveReminderDraft(teamId: string, memberId: string, kind: ReminderDraft['kind']) {
    setReminderDrafts((current) => [...current.filter((draft) => !(draft.teamId === teamId && draft.memberId === memberId && draft.kind === kind)), { teamId, memberId, kind }]);
  }

  function updateMember(teamId: string, memberId: string, changes: MemberChanges) {
    setTeams((current) => current.map((team) => team.id === teamId ? {
      ...team, members: team.members.map((member) => member.id === memberId ? { ...member, ...changes } : member),
    } : team));
  }

  function removeMember(teamId: string, memberId: string) {
    setTeams((current) => current.map((team) => team.id === teamId ? {
      ...team, members: team.members.filter((member) => member.id !== memberId),
    } : team));
    setReminderDrafts((current) => current.filter((draft) => draft.teamId !== teamId || draft.memberId !== memberId));
  }

  function addInvitationDraft(teamId: string, email: string, role: InvitationRole) {
    setInvitationDrafts((current) => [...current, {
      id: `invitation-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      teamId, email: email.trim().toLowerCase(), role,
    }]);
  }

  function createTeam(name: string) {
    const team: Team = { id: `team-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim(), members: [currentUserOwner] };
    setTeams((current) => [...current, team]);
    setSelectedId(team.id);
    return team;
  }

  function resetTeams() {
    setTeams(initialTeams);
    setSelectedId(undefined);
    setInvitationDrafts([]);
    setReminderDrafts([]);
  }

  return (
    <TeamsContext.Provider value={{ teams, selectedTeam: teams.find((team) => team.id === selectedId), selectTeam: setSelectedId, createTeam, resetTeams, invitationDrafts, addInvitationDraft, updateMember, removeMember, reminderDrafts, saveReminderDraft }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) throw new Error('useTeams must be used within TeamsProvider');
  return context;
}
