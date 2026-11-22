import { useAuth } from '@clerk/expo';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import type { MemberRole } from '@/context/members';
import { ApiError, errorMessage, jsonHeaders, useRequest } from '@/lib/api';

export type Team = { id: string; name: string; myRole: MemberRole };

// shape from backend/models.py
type ApiTeam = { teamId: string; name: string; myRole: MemberRole };

const fromApi = (team: ApiTeam): Team => ({ id: team.teamId, name: team.name, myRole: team.myRole });

type ReminderDraft = { teamId: string; memberId: string; kind: 'availability' | 'skills' };

type TeamsStatus = 'loading' | 'ready' | 'error';

const TeamsContext = createContext<{
  teams: Team[];
  status: TeamsStatus;
  error: string | null;
  refresh: () => Promise<void>;
  selectedTeam: Team | undefined;
  selectTeam: (id: string) => void;
  createTeam: (name: string) => Promise<Team>;
  renameTeam: (id: string, name: string) => Promise<Team>;
  deleteTeam: (id: string) => Promise<void>;
  reminderDrafts: ReminderDraft[];
  saveReminderDraft: (teamId: string, memberId: string, kind: ReminderDraft['kind']) => void;
  resetTeams: () => void;
} | null>(null);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const { isSignedIn } = useAuth();
  const request = useRequest();
  const [teams, setTeams] = useState<Team[]>([]);
  const [status, setStatus] = useState<TeamsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [reminderDrafts, setReminderDrafts] = useState<ReminderDraft[]>([]);

  const fetchTeams = useCallback(async (): Promise<ApiTeam[]> => (await request('/teams')).json(), [request]);

  const showTeams = useCallback((list: ApiTeam[]) => {
    setTeams(list.map(fromApi));
    setError(null);
    setStatus('ready');
  }, []);

  const showError = useCallback((e: unknown) => {
    setError(errorMessage(e));
    // if a refresh fails, keep showing the teams we already have
    setStatus((current) => current === 'ready' ? 'ready' : 'error');
  }, []);

  const refresh = useCallback(() => fetchTeams().then(showTeams, showError), [fetchTeams, showTeams, showError]);

  // this provider wraps the sign-in screens too, so only load once someone is signed in
  useEffect(() => {
    if (!isSignedIn) return;
    let stale = false;
    fetchTeams().then(
      (list) => { if (!stale) showTeams(list); },
      (e) => { if (!stale) showError(e); },
    );
    return () => { stale = true; };
  }, [isSignedIn, fetchTeams, showTeams, showError]);

  const createTeam = useCallback(async (name: string) => {
    const res = await request('/teams', { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ name: name.trim() }) });
    const team = fromApi(await res.json());
    setTeams((current) => [...current, team]);
    setSelectedId(team.id);
    return team;
  }, [request]);

  const renameTeam = useCallback(async (id: string, name: string) => {
    const body = JSON.stringify({ name: name.trim() });
    const res = await request(`/teams/${encodeURIComponent(id)}`, { method: 'PUT', headers: jsonHeaders, body });
    const team = fromApi(await res.json());
    setTeams((current) => current.map((item) => item.id === id ? team : item));
    return team;
  }, [request]);

  const deleteTeam = useCallback(async (id: string) => {
    try {
      await request(`/teams/${encodeURIComponent(id)}`, { method: 'DELETE' });
    } catch (e) {
      // 404 means it's already gone, so just drop it from the list
      if (!(e instanceof ApiError && e.status === 404)) throw e;
    }
    setTeams((current) => current.filter((team) => team.id !== id));
    setSelectedId((current) => current === id ? undefined : current);
    setReminderDrafts((current) => current.filter((draft) => draft.teamId !== id));
  }, [request]);

  function saveReminderDraft(teamId: string, memberId: string, kind: ReminderDraft['kind']) {
    setReminderDrafts((current) => [...current.filter((draft) => !(draft.teamId === teamId && draft.memberId === memberId && draft.kind === kind)), { teamId, memberId, kind }]);
  }

  function resetTeams() {
    setTeams([]);
    setStatus('loading');
    setError(null);
    setSelectedId(undefined);
    setReminderDrafts([]);
  }

  return (
    <TeamsContext.Provider value={{
      teams, status, error, refresh, selectedTeam: teams.find((team) => team.id === selectedId), selectTeam: setSelectedId,
      createTeam, renameTeam, deleteTeam, resetTeams, reminderDrafts, saveReminderDraft,
    }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) throw new Error('useTeams must be used within TeamsProvider');
  return context;
}
