import { registerRoleSmokeSuite } from "./helpers/auth";
import { pickRoleTestConfigs } from "./role-matrix";

registerRoleSmokeSuite(
  "Field Roles Smoke",
  pickRoleTestConfigs([
    "delivery_boy",
    "security_guard",
    "security_supervisor",
    "society_manager",
    "service_boy",
    "ac_technician",
    "pest_control_technician",
  ])
);
