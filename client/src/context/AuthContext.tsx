import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase, isDigitalMojoEmail, isAdminEmail } from "../lib/supabase";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "admin" | "user";
  isLoading: boolean;
  error: string | null;
  is2faVerified: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendDirectOtp: (email: string) => Promise<void>;
  verifyDirectOtp: (email: string, token: string) => Promise<void>;
  send2faOtp: () => Promise<void>;
  verify2faOtp: (token: string) => Promise<void>;
  updateProfile: (data: { fullName: string; team?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function get2faStorageKey(userId: string) {
  return `mojomap_2fa_${userId}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"admin" | "user">("user");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is2faVerified, setIs2faVerified] = useState(false);

  const applyUser = (u: User | null, s: Session | null, directOtpVerified = false) => {
    if (u && u.email) {
      if (!isDigitalMojoEmail(u.email)) {
        void supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setIs2faVerified(false);
        setError("Access restricted: Only @digitalmojo.in accounts are permitted.");
        return;
      }
      setUser(u);
      setSession(s);
      const isAdm = isAdminEmail(u.email) || u.user_metadata?.["role"] === "admin";
      setRole(isAdm ? "admin" : "user");
      setError(null);

      if (directOtpVerified) {
        sessionStorage.setItem(get2faStorageKey(u.id), "verified");
        setIs2faVerified(true);
      } else {
        const stored = sessionStorage.getItem(get2faStorageKey(u.id));
        setIs2faVerified(stored === "verified");
      }
    } else {
      setUser(null);
      setSession(null);
      setRole("user");
      setIs2faVerified(false);
    }
  };

  useEffect(() => {
    // Initial session retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      applyUser(session?.user ?? null, session);
      setIsLoading(false);
    });

    // Realtime auth listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null, session);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    if (!isDigitalMojoEmail(email)) {
      throw new Error("Only @digitalmojo.in email addresses can log in.");
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Password sign-in requires 2FA OTP verification
    applyUser(data.user, data.session, false);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    if (!isDigitalMojoEmail(email)) {
      throw new Error("Registration restricted: You must use an official @digitalmojo.in email.");
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: isAdminEmail(email) ? "admin" : "user",
        },
      },
    });
    if (error) throw error;
    applyUser(data.user, data.session, false);
  };

  const signInWithGoogle = async () => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          hd: "digitalmojo.in", // Prompts Google to restrict to digitalmojo.in hosted domain
        },
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
  };

  // Direct OTP Flow (People who log in directly with OTP)
  // shouldCreateUser is true so any new @digitalmojo.in user is automatically registered!
  const sendDirectOtp = async (email: string) => {
    setError(null);
    if (!isDigitalMojoEmail(email)) {
      throw new Error("Only @digitalmojo.in email addresses can log in.");
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  };

  const verifyDirectOtp = async (email: string, token: string) => {
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) throw error;
    // Logged in directly with OTP -> Mark 2FA verified immediately!
    applyUser(data.user, data.session, true);
  };

  // 2FA Challenge Flow (After Password or Google Sign-in)
  const send2faOtp = async () => {
    if (!user || !user.email) return;
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: user.email,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  };

  const verify2faOtp = async (token: string) => {
    if (!user || !user.email) throw new Error("No active user session");
    setError(null);
    const { data, error } = await supabase.auth.verifyOtp({
      email: user.email,
      token,
      type: "email",
    });
    if (error) throw error;

    sessionStorage.setItem(get2faStorageKey(user.id), "verified");
    setIs2faVerified(true);
    if (data.session) {
      setSession(data.session);
    }
  };

  // Update profile for first-time users (Full Name, Team/Department)
  const updateProfile = async (data: { fullName: string; team?: string }) => {
    setError(null);
    const { data: updated, error } = await supabase.auth.updateUser({
      data: {
        full_name: data.fullName,
        name: data.fullName,
        team: data.team,
      },
    });
    if (error) throw error;
    if (updated.user) {
      setUser(updated.user);
    }
  };

  const signOut = async () => {
    if (user) {
      sessionStorage.removeItem(get2faStorageKey(user.id));
    }
    await supabase.auth.signOut();
    applyUser(null, null, false);
  };

  // Authenticated fetch wrapper
  const authFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(init.headers || {});
    if (session?.access_token) {
      headers.set("Authorization", `Bearer ${session.access_token}`);
    }
    return fetch(input, { ...init, headers });
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        error,
        is2faVerified,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendDirectOtp,
        verifyDirectOtp,
        send2faOtp,
        verify2faOtp,
        updateProfile,
        signOut,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
