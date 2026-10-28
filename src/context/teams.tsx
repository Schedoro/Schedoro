import { createContext, type ReactNode, useContext, useState } from 'react';

type Team = { id: string; name: string };

const initialTeams: Team[] = [
  { id: 'house-fairy', name: 'The House Fairy' },
  { id: 'pipe-whisperer', name: 'The Pipe Whisperer' },
];

const TeamsContext = createContext<{
  teams: Team[];
  selectedTeam: Team | undefined;
  selectTeam: (id: string) => void;
  createTeam: (name: string) => Team;
  resetTeams: () => void;
} | null>(null);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const [teams, setTeams] = useState(initialTeams);
  const [selectedId, setSelectedId] = useState<string>();

  function createTeam(name: string) {
    const team = { id: `team-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: name.trim() };
    setTeams((current) => [...current, team]);
    setSelectedId(team.id);
    return team;
  }

  function resetTeams() {
    setTeams(initialTeams);
    setSelectedId(undefined);
  }

  return (
    <TeamsContext.Provider value={{ teams, selectedTeam: teams.find((team) => team.id === selectedId), selectTeam: setSelectedId, createTeam, resetTeams }}>
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams() {
  const context = useContext(TeamsContext);
  if (!context) throw new Error('useTeams must be used within TeamsProvider');
  return context;
}
