"use client";

import React, { useState, useEffect, createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

import { normalizePermissions } from "@/src/lib/platform/permissions";
import { supabase } from "@/src/lib/supabaseClient";
import { type AppRole } from "@/src/lib/auth/roles";

interface AuthContextType {
  user: User | null;
  userId: string | null;
  role: AppRole | null;
  permissions: string[];
  isActive: boolean;
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchUserRole(user.id);
      } else {
        resetState();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserRole(session.user.id);
      } else {
        resetState();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetState = () => {
    setUser(null);
    setRole(null);
    setPermissions([]);
    setIsActive(true);
    setIsLoading(false);
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("is_active, roles!inner(role_name, permissions)")
        .eq("id", userId)
        .single();

      if (error) throw error;

      const roleData = Array.isArray((data as any).roles)
        ? (data as any).roles[0]
        : (data as any).roles;

      setRole((roleData?.role_name ?? null) as AppRole | null);
      setPermissions(normalizePermissions(roleData?.permissions));
      setIsActive((data as any).is_active !== false);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
      setPermissions([]);
      setIsActive(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    setRole(null);
    setPermissions([]);
    setIsActive(true);

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }

    router.refresh();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        role,
        permissions,
        isActive,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
