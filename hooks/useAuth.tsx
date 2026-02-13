"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

/**
 * Auth context using @supabase/ssr.
 *
 * Authentication is now handled via cookie-based sessions managed by @supabase/ssr.
 * The middleware validates the session server-side via supabase.auth.getUser().
 * No more spoofable fp-auth-status cookie.
 */

interface AuthContextType {
  user: User | null;
  userId: string | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial session - @supabase/ssr reads from cookies automatically
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Clear UI state immediately for responsive UX
    setUser(null);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }

    // Force a router refresh so middleware re-evaluates auth state
    // and redirects to /login if needed
    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
