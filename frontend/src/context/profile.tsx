import { createContext, type ReactNode, useContext, useState } from 'react';

type Profile = { fullName: string; email: string };

const initialProfile: Profile = {
  fullName: 'Anya Popova',
  email: 'popovann@sheridancollege.ca',
};

const ProfileContext = createContext<{
  profile: Profile;
  saveProfile: (profile: Profile) => void;
  resetProfile: () => void;
} | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(initialProfile);

  return (
    <ProfileContext.Provider value={{ profile, saveProfile: setProfile, resetProfile: () => setProfile(initialProfile) }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
}
