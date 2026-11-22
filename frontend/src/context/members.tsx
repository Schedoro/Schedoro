import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useTeams } from '@/context/teams';
import { ApiError, type ApiLocation, type ApiWindow, type DayOfWeek, errorMessage, jsonHeaders, useTeamApi } from '@/lib/api';

export type MemberRole = 'owner' | 'manager' | 'worker';

// day is "Mon".."Sun", times are 24-hour "HH:MM" like the backend
export type WorkHours = { day: string; start: string; end: string };

export type TeamMember = {
  id: string;
  fullName: string;
  email: string;
  role: MemberRole;
  location: string;
  skills: string[];
  availability: WorkHours[];
  userId: string | null; // their Clerk user ID, null until they've joined
  invited: boolean; // added to the team but hasn't signed in yet
  avatarColor: string;
  initialsColor: string;
};

export type MemberChanges = Partial<Pick<TeamMember, 'fullName' | 'role' | 'location' | 'skills' | 'availability'>>;

// shapes from backend/models.py
type ApiMemberIn = {
  fullName: string;
  email: string;
  role: MemberRole;
  location: ApiLocation | null;
  skills: string[];
  availability: ApiWindow[];
  maxWeeklyHours: number | null;
};
type ApiMember = ApiMemberIn & { memberId: string; teamId: string; userId: string | null };

export const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayNames: Record<string, DayOfWeek> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
};

// same colour pairs the team screen had before. cyan is left out because that's the current user's.
// picked from the id so a member keeps the same colour every time
const avatarColors = [['#F5ADFF', '#A000BC'], ['#FFCEAE', '#A94B00'], ['#D5FFA6', '#539400'], ['#FFADB2', '#BD0000']];

function colorsFor(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [avatarColor, initialsColor] = avatarColors[hash % avatarColors.length];
  return { avatarColor, initialsColor };
}

// "09:00", "17:00" -> 8
export function hoursBetween(start: string, end: string) {
  const minutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  return (minutes(end) - minutes(start)) / 60;
}

function fromApi(member: ApiMember): TeamMember {
  return {
    id: member.memberId,
    fullName: member.fullName,
    email: member.email,
    role: member.role,
    location: member.location?.address ?? '',
    skills: member.skills,
    availability: weekdays.flatMap((day) => member.availability
      .filter((window) => window.dayOfWeek === dayNames[day])
      .map((window) => ({ day, start: window.startTime, end: window.endTime }))),
    userId: member.userId,
    invited: !member.userId,
    ...colorsFor(member.memberId),
  };
}

// starts from what the api sent so fields the app doesn't show (lat/long, maxWeeklyHours) aren't wiped
function toApi(member: ApiMember, changes: MemberChanges): ApiMemberIn {
  const address = (changes.location ?? member.location?.address ?? '').trim();
  return {
    fullName: (changes.fullName ?? member.fullName).trim(),
    email: member.email,
    role: changes.role ?? member.role,
    location: !address ? null : member.location?.address === address ? member.location : { address },
    skills: changes.skills ?? member.skills,
    availability: changes.availability
      ? changes.availability.map(({ day, start, end }) => ({ dayOfWeek: dayNames[day], startTime: start, endTime: end }))
      : member.availability,
    maxWeeklyHours: member.maxWeeklyHours,
  };
}

type MembersStatus = 'loading' | 'ready' | 'error';

const MembersContext = createContext<{
  members: TeamMember[];
  status: MembersStatus;
  error: string | null;
  refresh: () => Promise<void>;
  addMember: (fullName: string, email: string, role: MemberRole) => Promise<TeamMember>;
  updateMember: (id: string, changes: MemberChanges) => Promise<TeamMember>;
  removeMember: (id: string) => Promise<void>;
} | null>(null);

export function MembersProvider({ children }: { children: ReactNode }) {
  const { selectedTeam, teams } = useTeams();
  const request = useTeamApi((selectedTeam ?? teams[0])?.id, 'members'); // same fallback as the team screen
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<MembersStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const apiMembers = useRef(new Map<string, ApiMember>());

  const remember = useCallback((member: ApiMember) => {
    apiMembers.current.set(member.memberId, member);
    return fromApi(member);
  }, []);

  const fetchMembers = useCallback(async (): Promise<ApiMember[]> => (await request()).json(), [request]);

  const showMembers = useCallback((list: ApiMember[]) => {
    apiMembers.current.clear();
    setMembers(list.map(remember));
    setError(null);
    setStatus('ready');
  }, [remember]);

  const showError = useCallback((e: unknown) => {
    setError(errorMessage(e));
    // if a refresh fails, keep showing the members we already have
    setStatus((current) => current === 'ready' ? 'ready' : 'error');
  }, []);

  const refresh = useCallback(() => fetchMembers().then(showMembers, showError), [fetchMembers, showMembers, showError]);

  useEffect(() => {
    let stale = false; // ignore the response if the team changed while it was loading
    fetchMembers().then(
      (list) => { if (!stale) showMembers(list); },
      (e) => { if (!stale) showError(e); },
    );
    return () => { stale = true; };
  }, [fetchMembers, showMembers, showError]);

  const addMember = useCallback(async (fullName: string, email: string, role: MemberRole) => {
    const body: Partial<ApiMemberIn> = { fullName: fullName.trim(), email: email.trim().toLowerCase(), role };
    const res = await request('', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
    const added = remember(await res.json());
    setMembers((current) => [...current, added]);
    return added;
  }, [request, remember]);

  const updateMember = useCallback(async (id: string, changes: MemberChanges) => {
    const current = apiMembers.current.get(id);
    if (!current) throw new ApiError('This member isn’t on the team anymore. Pull down on the team list to refresh.');
    const res = await request(`/${encodeURIComponent(id)}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(toApi(current, changes)) });
    const updated = remember(await res.json());
    setMembers((list) => list.map((member) => member.id === id ? updated : member));
    return updated;
  }, [request, remember]);

  const removeMember = useCallback(async (id: string) => {
    try {
      await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      // 404 means they're already gone, so just drop them from the list
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    apiMembers.current.delete(id);
    setMembers((list) => list.filter((member) => member.id !== id));
  }, [request]);

  return (
    <MembersContext.Provider value={{ members, status, error, refresh, addMember, updateMember, removeMember }}>
      {children}
    </MembersContext.Provider>
  );
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (!context) throw new Error('useMembers must be used within MembersProvider');
  return context;
}
