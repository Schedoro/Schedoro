import { createContext, type ReactNode, useContext, useState } from 'react';

// which jobs and workers the Generate Schedule screen should use, with null meaning all of them
const ScheduleSelectionContext = createContext<{
  jobIds: string[] | null;
  setJobIds: (ids: string[] | null) => void;
  memberIds: string[] | null;
  setMemberIds: (ids: string[] | null) => void;
  notes: string;
  setNotes: (notes: string) => void;
} | null>(null);

export function ScheduleSelectionProvider({ children }: { children: ReactNode }) {
  const [jobIds, setJobIds] = useState<string[] | null>(null);
  const [memberIds, setMemberIds] = useState<string[] | null>(null);
  const [notes, setNotes] = useState('');
  return <ScheduleSelectionContext.Provider value={{ jobIds, setJobIds, memberIds, setMemberIds, notes, setNotes }}>{children}</ScheduleSelectionContext.Provider>;
}

export function useScheduleSelection() {
  const context = useContext(ScheduleSelectionContext);
  if (!context) throw new Error('useScheduleSelection must be used inside ScheduleSelectionProvider');
  return context;
}
