import { redirect } from "next/navigation";

export default function CompanyIndex() {
  redirect("/company/employees");
}
