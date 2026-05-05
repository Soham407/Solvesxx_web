import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SuperAdminControlCenter() {
  const items = [
    {
      href: "/settings/admins",
      title: "Admin Management",
      description: "Invite, suspend, promote, and reset admin-tier accounts.",
    },
    {
      href: "/settings/permissions",
      title: "Role & Permissions",
      description: "Assign the platform permission keys for this slice.",
    },
    {
      href: "/settings/audit-logs",
      title: "Audit Logs",
      description: "Inspect platform actions across accounts, roles, and settings.",
    },
    {
      href: "/settings/company",
      title: "System Configuration",
      description: "Tune inactivity, geo-fence, and checklist thresholds.",
    },
  ];

  return (
    <Card className="border-none shadow-card ring-1 ring-border xl:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold uppercase tracking-widest">
            Platform Control Center
          </CardTitle>
          <CardDescription>
            Core platform administration surfaces for the super admin role.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full border border-border/60 bg-muted/10 transition-all hover:border-primary/40 hover:bg-primary/5">
              <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                <div>
                  <p className="text-sm font-bold">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex items-center text-xs font-semibold text-primary">
                  Open module <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
