import { registerRoleSmokeSuite } from "./helpers/auth";
import { pickRoleTestConfigs } from "./role-matrix";

registerRoleSmokeSuite(
  "Platform Roles Smoke",
  pickRoleTestConfigs(["super_admin", "admin"])
);
