"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar, 
  ShieldCheck, 
  Edit3,
  History,
  FileText,
  MoreVertical,
  ArrowUpRight,
  Loader2,
  Shield,
  CheckCircle2,
  CircleAlert,
  Copy,
  Link2,
  LockKeyhole
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoleTag } from "@/components/shared/RoleTag";
import { StepperTimeline } from "@/components/shared/StepperTimeline";
import Link from "next/link";
import { EmployeeCompensationPanel } from "@/components/forms/EmployeeCompensationPanel";
import { useAuth } from "@/hooks/useAuth";
import {
  DOCUMENT_STATUS_CONFIG,
  DOCUMENT_TYPE_LABELS,
  useEmployeeDocuments,
} from "@/hooks/useEmployeeDocuments";
import { useEmployees } from "@/hooks/useEmployees";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type EmployeeDetailTab = "overview" | "onboarding" | "documents" | "activity" | "compensation";

function getEmployeeDetailTab(value: string | null): EmployeeDetailTab {
  if (value === "onboarding" || value === "documents" || value === "activity" || value === "compensation") {
    return value;
  }

  return "overview";
}

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAuth();
  const { getEmployeeById, isLoading, error } = useEmployees({ includeInactive: true });
  const [activeTab, setActiveTab] = useState<EmployeeDetailTab>(
    getEmployeeDetailTab(searchParams.get("tab"))
  );
  const [isResettingCredentials, setIsResettingCredentials] = useState(false);
  const [credentialResult, setCredentialResult] = useState<null | { temporary_password: string; email: string | null }>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isOpeningDocumentId, setIsOpeningDocumentId] = useState<string | null>(null);
  
  const employee = getEmployeeById(id as string);
  const {
    documents,
    isLoading: isDocumentsLoading,
    error: documentsError,
    getDownloadUrl,
    formatFileSize,
  } = useEmployeeDocuments({ employee_id: id as string });
  const employeeDocuments = documents.filter((doc) => doc.employee_id === (id as string));
  const canManageCompensation = role === "admin" || role === "super_admin";
  const isGuardProfile = employee?.role_name === "security_guard" || Boolean(employee?.guard_profile_id);
  const profileRoleLabel = employee?.role_name || employee?.role || employee?.designation_name || "Employee";
  const profileLocation = employee?.assigned_location_name || employee?.department || "Operations";
  const onboardingChecks = employee
    ? [
        { label: "Auth account", ok: Boolean(employee.auth_user_id), value: employee.email || "Missing login" },
        { label: "Public user link", ok: Boolean(employee.linked_user_id), value: employee.role_name || "Role missing" },
        { label: "Employee record", ok: true, value: employee.employee_code || employee.id.slice(0, 8) },
        { label: "Guard profile", ok: isGuardProfile && Boolean(employee.guard_profile_id), value: employee.guard_code || "Not provisioned" },
        { label: "Assigned location", ok: Boolean(employee.assigned_location_id), value: employee.assigned_location_name || "Unassigned" },
        { label: "Active shift", ok: Boolean(employee.shift_id), value: employee.shift_name || "No active shift" },
      ]
    : [];

  useEffect(() => {
    setActiveTab(getEmployeeDetailTab(searchParams.get("tab")));
  }, [searchParams]);

  const handleCopyPassword = async () => {
    if (!credentialResult?.temporary_password) return;
    await navigator.clipboard.writeText(credentialResult.temporary_password);
    setCopiedPassword(true);
    toast.success("Temporary password copied");
    setTimeout(() => setCopiedPassword(false), 1500);
  };

  const handleResetSecurityCredentials = async () => {
    if (!employee) return;
    setIsResettingCredentials(true);
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}/reset-security`, {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to reset security credentials");
      }
      setCredentialResult({
        temporary_password: payload.temporary_password,
        email: payload.email ?? null,
      });
      toast.success("Temporary password generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset security credentials");
    } finally {
      setIsResettingCredentials(false);
    }
  };

  const handleOpenDocument = async (filePath: string, documentId: string) => {
    setIsOpeningDocumentId(documentId);
    try {
      const url = await getDownloadUrl(filePath);
      if (!url) {
        throw new Error("Failed to generate document link");
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open document");
    } finally {
      setIsOpeningDocumentId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading dossier...</span>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive font-medium">{error || "Employee not found."}</p>
        <Button onClick={() => router.back()} variant="outline">Go Back</Button>
      </div>
    );
  }

  const onboardingSteps = onboardingChecks.map((check) => ({
    title: check.label,
    description: check.value,
    status: check.ok ? ("complete" as const) : ("current" as const),
    date: check.ok ? "Ready" : "Needs action",
  }));

  return (
    <div className="space-y-8 pb-20">
      {/* Header / Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/company/employees" className="hover:text-foreground transition-colors">Employees</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{id}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" />
            Download Dossier
          </Button>
          {canManageCompensation && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setActiveTab("compensation")}
            >
              <Briefcase className="h-4 w-4" />
              Payroll Setup
            </Button>
          )}
          <Button className="gap-2 shadow-md">
            <Edit3 className="h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-card overflow-hidden">
      <div className="h-24 bg-linear-to-r from-primary to-primary/60" />
            <CardContent className="pt-0 relative px-6 pb-6">
              <div className="flex flex-col items-center -mt-12">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold mt-4">{employee.full_name}</h2>
                <p className="text-sm text-muted-foreground font-medium">{profileRoleLabel}</p>
                <div className="flex gap-2 mt-4">
                  <RoleTag role={profileRoleLabel} />
                  <StatusBadge status={employee.is_active ? "Active" : "Inactive"} />
                </div>
              </div>

              <div className="mt-8 space-y-4 pt-6 border-t">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                       <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Email</span>
                       <span className="text-sm font-medium">{employee.email || "N/A"}</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                       <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Phone</span>
                       <span className="text-sm font-medium">{employee.phone || "N/A"}</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                       <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Location</span>
                       <span className="text-sm font-medium">{profileLocation}</span>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-card">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
               <Button
                 variant="outline"
                 className="justify-start gap-3 h-11 border-dashed hover:border-primary hover:text-primary transition-all"
                 onClick={handleResetSecurityCredentials}
                 disabled={isResettingCredentials || !employee.auth_user_id}
               >
                  {isResettingCredentials ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Reset Security Credentials
               </Button>
               <Button variant="outline" className="justify-start gap-3 h-11 border-dashed hover:border-primary hover:text-primary transition-all">
                  <History className="h-4 w-4" />
                  View Attendance History
               </Button>
               {isGuardProfile && (
                 <Button asChild variant="outline" className="justify-start gap-3 h-11 border-dashed hover:border-primary hover:text-primary transition-all">
                    <Link href="/services/security">
                      <Shield className="h-4 w-4" />
                      Open Guard Command Center
                    </Link>
                 </Button>
               )}
               <Button
                 variant="outline"
                 className="justify-start gap-3 h-11 border-dashed hover:border-primary hover:text-primary transition-all"
                 onClick={() => setActiveTab("compensation")}
               >
                  <Briefcase className="h-4 w-4" />
                  Manage Payroll Setup
               </Button>
            </CardContent>
          </Card>
          {credentialResult && (
            <Card className="border-none shadow-card ring-1 ring-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Temporary Password</CardTitle>
                <CardDescription>
                  This password is only shown once. Share it securely, then ask the user to change it after login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-xl border bg-background px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Generated credential</p>
                      <p className="font-mono text-sm font-bold break-all">{credentialResult.temporary_password}</p>
                      {credentialResult.email && (
                        <p className="text-xs text-muted-foreground mt-1">Login email: {credentialResult.email}</p>
                      )}
                    </div>
                    <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword}>
                      {copiedPassword ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EmployeeDetailTab)} className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
              <TabsTrigger value="overview" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Overview</TabsTrigger>
              <TabsTrigger value="onboarding" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Onboarding Status</TabsTrigger>
              <TabsTrigger value="compensation" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Compensation</TabsTrigger>
              <TabsTrigger value="documents" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Documents</TabsTrigger>
              <TabsTrigger value="activity" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                 <Card className="border-none shadow-card ring-1 ring-border">
                    <CardHeader className="pb-2">
                       <CardTitle className="text-base font-bold">Employment Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex justify-between py-2 border-b border-dashed">
                          <span className="text-sm text-muted-foreground">Personnel ID</span>
                          <span className="text-sm font-bold">{id}</span>
                       </div>
                       <div className="flex justify-between py-2 border-b border-dashed">
                          <span className="text-sm text-muted-foreground">Department</span>
                          <span className="text-sm font-bold">{employee.department || "General"}</span>
                       </div>
                       <div className="flex justify-between py-2 border-b border-dashed">
                          <span className="text-sm text-muted-foreground">Assigned Site</span>
                          <span className="text-sm font-bold">{employee.assigned_location_name || "Unassigned"}</span>
                       </div>
                       <div className="flex justify-between py-2 border-b border-dashed">
                          <span className="text-sm text-muted-foreground">Active Shift</span>
                          <span className="text-sm font-bold">{employee.shift_name || "No active shift"}</span>
                       </div>
                        <div className="flex justify-between py-2 border-b border-dashed text-right">
                          <span className="text-sm text-muted-foreground">Role</span>
                          <span className="text-sm font-bold">{profileRoleLabel}</span>
                        </div>
                       <div className="flex justify-between py-2 border-b border-dashed">
                          <span className="text-sm text-muted-foreground">Joined Date</span>
                          <span className="text-sm font-bold">
                            {employee.created_at ? new Date(employee.created_at).toLocaleDateString() : "N/A"}
                          </span>
                       </div>
                    </CardContent>
                 </Card>

                 <Card className="border-none shadow-card ring-1 ring-border">
                    <CardHeader className="pb-2">
                       <CardTitle className="text-base font-bold">System Access</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                             <div className={`h-2 w-2 rounded-full ${employee.linked_user_id ? "bg-success" : "bg-warning"}`} />
                             <span className="text-sm font-medium">ERP Access</span>
                          </div>
                          <StatusBadge status={employee.linked_user_id ? "active" : "pending"} className="text-[10px]" />
                       </div>
                       <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                             <div className={`h-2 w-2 rounded-full ${employee.guard_profile_id ? "bg-success" : "bg-warning"}`} />
                             <span className="text-sm font-medium">Mobile App</span>
                          </div>
                          <StatusBadge status={employee.guard_profile_id || employee.linked_user_id ? "active" : "pending"} className="text-[10px]" />
                       </div>
                       <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                             <div className={`h-2 w-2 rounded-full ${employee.must_change_password ? "bg-warning" : "bg-success"}`} />
                             <span className="text-sm font-medium">Password Rotation</span>
                          </div>
                          <StatusBadge status={employee.must_change_password ? "pending" : "active"} className="text-[10px]" />
                       </div>
                       {isGuardProfile && (
                         <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                           Guard code {employee.guard_code || "not generated"} • {employee.assigned_location_name || "No site"} • {employee.shift_name || "No shift"}
                         </div>
                       )}
                    </CardContent>
                 </Card>
              </div>
            </TabsContent>

            <TabsContent value="onboarding" className="pt-6">
               <div className="space-y-6">
                  <Card className="border-none shadow-card ring-1 ring-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Provisioning Chain</CardTitle>
                      <CardDescription>Shows the real auth, role, guard, site, and shift state used by mobile and admin flows.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      {onboardingChecks.map((check) => (
                        <div key={check.label} className="rounded-xl border p-4 bg-card">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold">{check.label}</p>
                              <p className="text-xs text-muted-foreground mt-1">{check.value}</p>
                            </div>
                            {check.ok ? (
                              <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Ready
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
                                <CircleAlert className="h-3.5 w-3.5" />
                                Missing
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-card ring-1 ring-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Operator Guidance</CardTitle>
                      <CardDescription>Use this when a guard or resident cannot log in or is missing assignment data.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 px-10 pb-10">
                      <StepperTimeline steps={onboardingSteps} />
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-card ring-1 ring-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Support Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-start gap-3">
                        <LockKeyhole className="h-4 w-4 mt-0.5 text-primary" />
                        <p>Temporary passwords are only shown at creation or after using <span className="font-semibold text-foreground">Reset Security Credentials</span>.</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <Link2 className="h-4 w-4 mt-0.5 text-primary" />
                        <p>Phone login and demo OTP require the linked auth user, public user role, and guard/resident profile to all be present.</p>
                      </div>
                      {isGuardProfile && (
                        <div className="flex items-start gap-3">
                          <Shield className="h-4 w-4 mt-0.5 text-primary" />
                          <p>Guards must have both an assigned site and an active shift before mobile demo OTP and attendance will work reliably.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
               </div>
            </TabsContent>

            <TabsContent value="compensation" className="pt-6">
              <EmployeeCompensationPanel
                employeeId={id as string}
                employeeName={employee.full_name || "Employee"}
                canManage={canManageCompensation}
              />
            </TabsContent>

            <TabsContent value="documents" className="pt-6">
               <div className="grid gap-4">
                  {isDocumentsLoading ? (
                    <div className="flex items-center justify-center rounded-xl border bg-card p-8 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading documents...
                    </div>
                  ) : documentsError ? (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
                      {documentsError}
                    </div>
                  ) : employeeDocuments.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
                      No documents uploaded for this employee yet.
                    </div>
                  ) : (
                    employeeDocuments.map((doc) => {
                      const statusConfig = DOCUMENT_STATUS_CONFIG[doc.status];
                      const typeLabel = DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type;

                      return (
                        <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow group">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                             <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-sm ">{doc.document_name || doc.file_name}</span>
                             <span className="text-xs text-muted-foreground">
                               {typeLabel} • {formatFileSize(doc.file_size)}
                             </span>
                             <span className={`mt-1 inline-flex w-fit rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusConfig.className}`}>
                               {statusConfig.label}
                             </span>
                          </div>
                       </div>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => handleOpenDocument(doc.file_path, doc.id)}
                         disabled={isOpeningDocumentId === doc.id}
                       >
                          {isOpeningDocumentId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                       </Button>
                    </div>
                      );
                    })
                  )}
                  <Button variant="outline" className="border-dashed h-20 text-muted-foreground hover:text-primary hover:border-primary transition-all">
                     + Upload New Document
                  </Button>
               </div>
            </TabsContent>

            <TabsContent value="activity" className="pt-6">
               <Card className="border-none shadow-card ring-1 ring-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                     <CardTitle className="text-base font-bold">System Log</CardTitle>
                     <Button variant="ghost" size="sm" className="text-xs">Export Audit</Button>
                  </CardHeader>
                  <CardContent className="p-0">
                     <div className="divide-y">
                        {[
                          { action: "Login Success", system: "Web Client", time: "2024-02-01 09:15 AM", ip: "192.168.1.1" },
                          { action: "Profile Updated", system: "Admin Portal", time: "2024-01-28 02:30 PM", ip: "10.0.0.42" },
                          { action: "Password Changed", system: "Self Service", time: "2024-01-20 11:00 AM", ip: "192.168.1.5" },
                        ].map((log, i) => (
                          <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                             <div className="flex flex-col gap-1">
                                <span className="text-sm font-bold ">{log.action}</span>
                                <span className="text-xs text-muted-foreground">{log.system} • {log.ip}</span>
                             </div>
                             <span className="text-xs font-medium text-muted-foreground">{log.time}</span>
                          </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
