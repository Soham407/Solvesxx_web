"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import {
  ShieldAlert,
  Award,
  BookOpen,
  Fingerprint,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTechnicians } from "@/hooks/useTechnicians";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function SpecializedProfilesPage() {
  const { technicians, isLoading } = useTechnicians();

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Specialized Personnel Profiles"
        description="High-security roles requiring ballistic training, surveillance certifications, and enhanced background vetting."
        actions={
          <Button className="gap-2 shadow-sm">
            <Award className="h-4 w-4" /> Verify Credentials
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border">
              <CardHeader className="p-6 pb-2">
                <Skeleton className="h-5 w-24 mb-4" />
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-6 border-t border-dashed mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="h-10 rounded-lg" />
                  <Skeleton className="h-10 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : technicians.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-muted/20">
          <UserX className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-bold">No Specialized Profiles Found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-2">
            No active technician profiles exist yet. Add technicians via the Employee module and assign them a technician profile to see them here.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <Card
              key={tech.id}
              className="border-none shadow-card ring-1 ring-border group hover:ring-primary/20 transition-all"
            >
              <CardHeader className="p-6 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 font-bold text-[10px] uppercase truncate max-w-[160px]"
                  >
                    {tech.designation ?? "Specialist"}
                  </Badge>
                  <div
                    className={`h-2 w-2 rounded-full animate-pulse ${
                      tech.is_active ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-background ring-2 ring-primary/5 shadow-xl">
                    {tech.photo_url && <AvatarImage src={tech.photo_url} alt={tech.full_name} />}
                    <AvatarFallback className="bg-muted text-lg font-bold">
                      {getInitials(tech.full_name ?? "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0">
                    <CardTitle className="text-xl font-bold truncate">{tech.full_name}</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      ID: {tech.employee_code ?? "—"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-6 border-t border-dashed mt-4 space-y-4">
                {/* Skills */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Skills</p>
                  {tech.skills && tech.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tech.skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-semibold">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No skills recorded</p>
                  )}
                </div>

                {/* Certifications */}
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2">Certifications</p>
                  {tech.certifications && tech.certifications.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {tech.certifications.map((cert, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] font-semibold bg-success/5 text-success border-success/20"
                        >
                          {cert}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No certifications recorded</p>
                  )}
                </div>

                <Badge
                  variant="outline"
                  className={`w-full justify-center py-1 text-[10px] font-bold uppercase ${
                    tech.is_active
                      ? "bg-success/5 text-success border-success/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tech.is_active ? "Active" : "Inactive"}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="p-8 text-center border-2 border-dashed rounded-3xl bg-muted/20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="text-lg font-bold">Certification Compliance Vault</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-2">
          All specialized personnel must undergo annual arms license verification and psychological vetting.
          Documents are encrypted and stored in the HR Governance portal.
        </p>
        <div className="flex justify-center gap-4 mt-6">
          <Badge variant="secondary" className="gap-2 px-3 py-1 font-bold">
            <Fingerprint className="h-3.5 w-3.5 text-primary" /> Biometric Verified
          </Badge>
          <Badge variant="secondary" className="gap-2 px-3 py-1 font-bold">
            <BookOpen className="h-3.5 w-3.5 text-info" /> Background Clear
          </Badge>
        </div>
      </div>
    </div>
  );
}
