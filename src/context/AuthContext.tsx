import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { completeGoogleRedirectSignIn, onAuthChange } from "../services/auth.service";
import { subscribeUserProfile } from "../services/users.service";
import type { UserProfile } from "../types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const PROFILE_GRACE_MS = 6000;

const AuthContext = createContext<AuthContextValue>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => onAuthChange((u) => {
    setUser(u);
    setAuthLoading(false);
  }), []);

  // No-op unless the app is returning from a Google sign-in that fell back
  // to a redirect (see auth.service.ts's signInWithGoogle) — completes it
  // and creates the profile doc for a first-time Google user. Errors here
  // aren't shown anywhere in particular; the user just stays signed out and
  // can retry from the login screen.
  useEffect(() => {
    completeGoogleRedirectSignIn().catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    // "Signed in but no profile document" is normal for a moment right
    // after creating an account: Firebase Auth reports the new user before
    // the sign-up code has written their profile. Rendering the app in
    // that gap showed a working-looking UI in which every form silently
    // refused to save (they all need the profile). So a missing profile
    // keeps the loading screen up for a few seconds before it's believed.
    let missingTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeUserProfile(
      user.uid,
      (p) => {
        clearTimeout(missingTimer);
        setProfile(p);
        if (p) setProfileLoading(false);
        else missingTimer = setTimeout(() => setProfileLoading(false), PROFILE_GRACE_MS);
      },
      // The listener is dead after an error; don't sit on the loading
      // screen forever because of it.
      () => setProfileLoading(false)
    );
    return () => {
      clearTimeout(missingTimer);
      unsubscribe();
    };
  }, [user]);

  const loading = authLoading || (Boolean(user) && profileLoading && !profile);

  return <AuthContext.Provider value={{ user, profile, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
