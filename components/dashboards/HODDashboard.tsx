"use client";

import { PieChart, ResponsiveContainer, Pie, Cell, Tooltip } from "recharts";
import { Users, Briefcase, CalendarCheck, CheckSquare, Clock, ArrowRight, UserPlus, Filter, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useHODStats } from "@/hooks/useHODStats";
import { useLeaveApplications } from "@/hooks/useLeaveApplications";
import { useServiceRequests } from "@/hooks/useServiceRequests";

export function HODDashboard() {
  const { stats, isLoading: isLoadingStats } = useHODStats("Facility");
  const { applications, isLoading: isLoadingLeaves } = useLeaveApplications();
  const { requests, isLoading: isLoadingRequests } = useServiceRequests({ status: ["completed"] });

  const isLoading = isLoadingStats || isLoadingLeaves || isLoadingRequests;

  // Filter pending leave applications
  const pendingLeaves = applications?.filter(app => app.status === "pending") || [];

  // Count tasks completed today
  const today = new Date().toISOString().split("T")[0];
  const tasksCompletedToday = requests?.filter(req => 
    req.status === "completed" && 
    req.completed_at && 
    typeof req.completed_at === "string" &&
    req.completed_at.startsWith(today)
  ).length || 0;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl font-bold ">Departmental Management (HOD)</h1>
          <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Team productivity, leave approvals, and resource allocation.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2 font-bold border-muted-foreground/20">
                <Filter className="h-4 w-4" /> Filter Dept
            </Button>
            <Button className="gap-2 font-bold shadow-lg shadow-primary/10">
                <UserPlus className="h-4 w-4" /> Personnel Req
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {[
            { 
              label: "Total Strength", 
              value: isLoadingStats ? "..." : stats.totalStrength.toString(), 
              icon: Users, 
              color: "text-primary" 
            },
            { 
              label: "Attendance Rate", 
              value: isLoadingStats ? "..." : `${stats.attendanceRate}%`, 
              icon: CalendarCheck, 
              color: stats.attendanceRate >= 90 ? "text-success" : stats.attendanceRate >= 70 ? "text-warning" : "text-critical" 
            },
            { 
              label: "Pending Approvals", 
              value: isLoadingLeaves ? "..." : pendingLeaves.length.toString(), 
              icon: Clock, 
              color: pendingLeaves.length > 0 ? "text-warning" : "text-success" 
            },
            { 
              label: "Tasks Completed", 
              value: isLoadingRequests ? "..." : tasksCompletedToday.toString(), 
              icon: CheckSquare, 
              color: "text-info" 
            },
        ].map((stat, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                <div className="flex items-center gap-4 text-left">
                    <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                        <stat.icon className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold ">{stat.value}</span>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest leading-none mt-1">{stat.label}</span>
                    </div>
                </div>
            </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-none shadow-card ring-1 ring-border">
             <CardHeader className="bg-muted/5 border-b">
                <CardTitle className="text-sm font-bold uppercase flex items-center justify-between">
                  Team Leave Applications
                  {!isLoadingLeaves && pendingLeaves.length > 0 && (
                    <Badge variant="default" className="bg-warning text-warning-foreground">
                      {pendingLeaves.length} Pending
                    </Badge>
                  )}
                </CardTitle>
             </CardHeader>
             <CardContent className="p-0">
                <div className="divide-y text-left">
                   {isLoadingLeaves ? (
                     <div className="p-8 text-center">
                       <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                     </div>
                   ) : pendingLeaves.length > 0 ? (
                     pendingLeaves.map((req) => (
                       <div key={req.id} className="p-4 flex items-center justify-between group hover:bg-muted/20 transition-colors">
                           <div className="flex items-center gap-4">
                               <Avatar className="h-9 w-9 ring-2 ring-primary/5">
                                    <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">
                                      {req.employee ? `${req.employee.first_name.charAt(0)}${req.employee.last_name.charAt(0)}` : "??"}
                                    </AvatarFallback>
                               </Avatar>
                               <div className="flex flex-col">
                                   <span className="text-sm font-bold ">
                                     {req.employee ? `${req.employee.first_name} ${req.employee.last_name}` : "Unknown"}
                                   </span>
                                   <span className="text-[10px] text-muted-foreground font-bold uppercase ">
                                     {req.leave_type?.leave_name} • {new Date(req.from_date).toLocaleDateString("en-IN")} - {new Date(req.to_date).toLocaleDateString("en-IN")}
                                   </span>
                               </div>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-success border-success/20 hover:bg-success/5">Approve</Button>
                               <Button size="sm" variant="outline" className="h-8 text-[10px] font-bold uppercase text-critical border-critical/20 hover:bg-critical/5">Reject</Button>
                           </div>
                       </div>
                     ))
                   ) : (
                     <div className="p-8 text-center text-muted-foreground">
                       <CheckSquare className="h-8 w-8 text-success mx-auto mb-2" />
                       <p className="text-sm font-medium">No pending leave applications</p>
                       <p className="text-xs">All caught up!</p>
                     </div>
                   )}
                </div>
             </CardContent>
          </Card>

          <Card className="border-none shadow-card ring-1 ring-border">
             <CardHeader>
                 <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Force Distribution</CardTitle>
             </CardHeader>
             <CardContent>
                 {isLoadingStats ? (
                   <div className="h-[200px] w-full flex items-center justify-center">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                   </div>
                 ) : (
                   <>
                     <div className="h-[200px] w-full">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie 
                             data={stats.distribution} 
                             innerRadius={60} 
                             outerRadius={80} 
                             paddingAngle={5} 
                             dataKey="value"
                           >
                             {stats.distribution.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                           </Pie>
                           <Tooltip />
                         </PieChart>
                       </ResponsiveContainer>
                     </div>
                     <div className="space-y-2 mt-4">
                         {stats.distribution.map((item) => (
                             <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                                 <div className="flex items-center gap-2">
                                     <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                     <span className="text-muted-foreground">{item.name}</span>
                                 </div>
                                 <span>{item.value} ({stats.totalStrength > 0 ? Math.round((item.value / stats.totalStrength) * 100) : 0}%)</span>
                             </div>
                         ))}
                     </div>
                   </>
                 )}
                 <Button variant="ghost" className="w-full text-[10px] font-bold uppercase tracking-widest text-primary mt-6 border-dashed border-2">
                   Redeploy Resources <ArrowRight className="ml-2 h-3 w-3" />
                 </Button>
             </CardContent>
          </Card>
      </div>
    </div>
  );
}
