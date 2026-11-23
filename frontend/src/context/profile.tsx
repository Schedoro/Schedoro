import { useUser } from '@clerk/expo';
import { createContext, type ReactNode, useCallback, useContext } from 'react';

type Profile = { fullName: string; email: string };

const ProfileContext = createContext<{
  profile: Profile;
  saveName: (fullName: string) => Promise<void>;
} | null>(null);

// name and email come straight from the Clerk account, so they're the same on every device and team
export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();

  const profile: Profile = {
    fullName: user?.fullName ?? '',
    email: user?.primaryEmailAddress?.emailAddress ?? '',
  };

  const saveName = useCallback(async (fullName: string) => {
    if (!user) throw new Error('You’re not signed in.');
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    await user.update({ firstName, lastName: rest.join(' ') });
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, saveName }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
