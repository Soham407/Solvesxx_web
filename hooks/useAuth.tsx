"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/src/lib/supabaseClient";
import type { User } from "@supabase/supabase-js";

// Cookie name must match middleware.ts
const AUTH_COOKIE = "fp-auth-status";

/** Set or clear the auth indicator cookie used by middleware for route protection. */
function setAuthCookie(authenticated: boolean) {
  if (typeof document === "undefined") return;

  if (authenticated) {
    // HttpOnly is not possible from JS, but SameSite=Strict + Secure provides CSRF protection.
    // This cookie is an indicator only -- actual auth is validated server-side via Supabase JWT.
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AUTH_COOKIE}=1; path=/; SameSite=Strict; max-age=604800${secure}`;
  } else {
    document.cookie = `${AUTH_COOKIE}=; path=/; SameSite=Strict; max-age=0`;
  }
}

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

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthCookie(!!currentUser);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthCookie(!!currentUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // Fix race condition: clear UI state and cookie BEFORE awaiting network call.
    // This ensures the user sees "logged out" immediately, even if signOut() is slow or fails.
    setUser(null);
    setAuthCookie(false);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      // State is already cleared -- user remains logged out in UI.
      // If the server session persists, onAuthStateChange will re-authenticate on next page load.
    }
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
