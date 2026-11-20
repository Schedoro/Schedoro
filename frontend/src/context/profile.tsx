import { useUser } from '@clerk/expo';
import { createContext, type ReactNode, useContext, useState } from 'react';

type Profile = { fullName: string; email: string };

const ProfileContext = createContext<{
  profile: Profile;
  saveProfile: (profile: Profile) => void;
  resetProfile: () => void;
} | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  // Local edits from the Profile screen. Saving them to Clerk is still to do.
  const [edits, setEdits] = useState<Profile | null>(null);

  const profile: Profile = edits ?? {
    fullName: user?.fullName ?? '',
    email: user?.primaryEmailAddress?.emailAddress ?? '',
  };

  return (
    <ProfileContext.Provider value={{ profile, saveProfile: setEdits, resetProfile: () => setEdits(null) }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
