import { registerRoleSmokeSuite } from "./helpers/auth";
import { pickRoleTestConfigs } from "./role-matrix";

registerRoleSmokeSuite(
  "Management Roles Smoke",
  pickRoleTestConfigs([
    "company_md",
    "company_hod",
    "account",
    "storekeeper",
    "site_supervisor",
  ])
);
