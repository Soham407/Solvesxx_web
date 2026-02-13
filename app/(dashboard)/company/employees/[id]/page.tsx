"use client";

import { useParams, useRouter } from "next/navigation";
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
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoleTag } from "@/components/shared/RoleTag";
import { StepperTimeline } from "@/components/shared/StepperTimeline";
import Link from "next/link";
import { useEmployees } from "@/hooks/useEmployees";

export default function EmployeeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { getEmployeeById, isLoading, error } = useEmployees();
  
  const employee = getEmployeeById(id as string);

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

  const onboardingSteps = [
    { title: "Document Verification", description: "Identity and address proof verified by HR", status: "complete" as const, date: employee.created_at ? new Date(employee.created_at).toLocaleDateString() : "2024-01-05" },
    { title: "Background Check", description: "Standard criminal and professional record check", status: "complete" as const, date: employee.created_at ? new Date(employee.created_at).toLocaleDateString() : "2024-01-10" },
    { title: "Hardware Assignment", description: "Laptop and security badge issuance", status: "current" as const, date: "In Progress" },
    { title: "System Access", description: "Provisioning ERP and email accounts", status: "upcoming" as const },
    { title: "Final Orientation", description: "Introduction to company policies and culture", status: "upcoming" as const },
  ];

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
                <p className="text-sm text-muted-foreground font-medium">{employee.role || "Employee"}</p>
                <div className="flex gap-2 mt-4">
                  <RoleTag role={employee.role || "Staff"} />
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
                       <span className="text-sm font-medium">{employee.department || "Operations"}</span>
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
               <Button variant="outline" className="justify-start gap-3 h-11 border-dashed hover:border-primary hover:text-primary transition-all">
                  <ShieldCheck className="h-4 w-4" />
                  Reset Security Credentials
               </Button>
               <Button variant="outline" className="justify-start gap-3 h-11 border-dashed hover:border-primary hover:text-primary transition-all">
                  <History className="h-4 w-4" />
                  View Attendance History
               </Button>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-transparent border-b rounded-none w-full justify-start h-auto p-0 gap-8">
              <TabsTrigger value="overview" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Overview</TabsTrigger>
              <TabsTrigger value="onboarding" className="px-0 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-bold text-xs uppercase tracking-widest">Onboarding Status</TabsTrigger>
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
                        <div className="flex justify-between py-2 border-b border-dashed text-right">
                          <span className="text-sm text-muted-foreground">Role</span>
                          <span className="text-sm font-bold">{employee.role || "Staff"}</span>
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
                             <div className="h-2 w-2 rounded-full bg-success" />
                             <span className="text-sm font-medium">ERP Access</span>
                          </div>
                          <StatusBadge status="active" className="text-[10px]" />
                       </div>
                       <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                             <div className="h-2 w-2 rounded-full bg-success" />
                             <span className="text-sm font-medium">Mobile App</span>
                          </div>
                          <StatusBadge status="active" className="text-[10px]" />
                       </div>
                       <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                             <div className="h-2 w-2 rounded-full bg-warning" />
                             <span className="text-sm font-medium">Financial Portal</span>
                          </div>
                          <StatusBadge status="pending" className="text-[10px]" />
                       </div>
                    </CardContent>
                 </Card>
              </div>
            </TabsContent>

            <TabsContent value="onboarding" className="pt-6">
               <Card className="border-none shadow-card ring-1 ring-border">
                  <CardHeader>
                     <CardTitle className="text-lg">Onboarding Progress</CardTitle>
                     <CardDescription>Track the initial setup steps for this employee.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 px-10 pb-10">
                     <StepperTimeline steps={onboardingSteps} />
                  </CardContent>
               </Card>
            </TabsContent>

            <TabsContent value="documents" className="pt-6">
               <div className="grid gap-4">
                  {[
                    { name: "Identity Proof.pdf", size: "1.2 MB", type: "ID Proof" },
                    { name: "Employment Contract.pdf", size: "2.5 MB", type: "Legal" },
                    { name: "Security Bond.pdf", size: "850 KB", type: "Security" },
                  ].map((doc) => (
                    <div key={doc.name} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-shadow group">
                       <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                             <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold text-sm ">{doc.name}</span>
                             <span className="text-xs text-muted-foreground">{doc.type} • {doc.size}</span>
                          </div>
                       </div>
                       <Button variant="ghost" size="icon">
                          <ArrowUpRight className="h-4 w-4" />
                       </Button>
                    </div>
                  ))}
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
