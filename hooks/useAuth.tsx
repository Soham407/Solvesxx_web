"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { type AppRole } from "@/src/lib/auth/roles";

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
  role: AppRole | null;
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
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get initial user - MUST use getUser() for server-side validation
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchUserRole(user.id);
      } else {
        setUser(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      } else {
        setUser(null);
        setRole(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("roles!inner(role_name)")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setRole((data as any).roles.role_name as AppRole);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    // Clear UI state immediately for responsive UX
    setUser(null);
    setRole(null);

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
        role,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
