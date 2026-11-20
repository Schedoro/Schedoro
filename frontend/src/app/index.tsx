import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';

// The app's entry URL ("/"). It isn't guarded, so it always resolves: signed-in users go to
// their teams and everyone else to sign-in. The root layout only renders once Clerk has loaded.
export default function Index() {
  const { isSignedIn } = useAuth();
  return <Redirect href={isSignedIn ? '/teams' : '/sign-in'} />;
}
