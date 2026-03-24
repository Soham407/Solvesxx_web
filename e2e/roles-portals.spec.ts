import { registerRoleSmokeSuite } from "./helpers/auth";
import { pickRoleTestConfigs } from "./role-matrix";

registerRoleSmokeSuite(
  "Portal Roles Smoke",
  pickRoleTestConfigs(["buyer", "supplier", "vendor", "resident"])
);
