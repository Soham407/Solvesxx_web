import rawRoleMatrix from "./role-matrix.data.json";

import type { AppRole } from "../src/lib/auth/roles";

export const ROLE_TEST_PASSWORD = "Test@1234";

export type RoleJourneyCheck = {
  path: string;
  label: string;
  readyText?: string;
  emptyStateText?: string;
  ctaText?: string;
};

export type RoleTestConfig = {
  role: AppRole;
  email: string;
  password: string;
  fullName: string;
  username: string;
  expectedLandingPath: string;
  allowedPath: string;
  blockedPath: string;
  journey: RoleJourneyCheck;
};

export type ProvisionedRoleUserResult = {
  role: AppRole;
  email: string;
  authUserId: string;
  publicUserId: string;
  status: "created" | "updated" | "repaired" | "unchanged";
  notes: string[];
};

type RawRoleTestConfig = Omit<RoleTestConfig, "password">;

export const roleTestMatrix = (rawRoleMatrix as RawRoleTestConfig[]).map((entry) => ({
  ...entry,
  password: ROLE_TEST_PASSWORD,
}));

export const roleTestMatrixByRole = Object.fromEntries(
  roleTestMatrix.map((entry) => [entry.role, entry])
) as Record<AppRole, RoleTestConfig>;

export function getRoleTestConfig(role: AppRole): RoleTestConfig {
  return roleTestMatrixByRole[role];
}

export function pickRoleTestConfigs(roles: AppRole[]): RoleTestConfig[] {
  return roles.map(getRoleTestConfig);
}
