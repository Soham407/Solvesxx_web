"use client";

import { useEmergencyContacts, EmergencyContact } from "@/hooks/useEmergencyContacts";
import { AddEmergencyContactDialog } from "@/components/phaseA/AddEmergencyContactDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { 
  Phone, 
  MapPin, 
  ShieldAlert, 
  MoreHorizontal,
  Search,
  ChevronRight,
  Trash2
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function EmergencyDirectoryPage() {
  const { contacts, isLoading, deleteContact, fetchContacts } = useEmergencyContacts();

  const columns: ColumnDef<EmergencyContact>[] = [
    {
      accessorKey: "contact_name",
      header: "Agency / Contact Name",
      cell: ({ row }) => {
        const type = row.original.contact_type;
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              type === "police" ? "bg-critical/5 text-critical" :
              type === "fire" ? "bg-orange-500/5 text-orange-500" :
              type === "ambulance" ? "bg-success/5 text-success" : "bg-primary/5 text-primary"
            )}>
              <Phone className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-sm ">{row.original.contact_name}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold ">{type} • {row.original.id.slice(0, 8)}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "phone_number",
      header: "Primary Contact",
      cell: ({ row }) => <span className="text-sm font-bold text-foreground">{row.getValue("phone_number")}</span>,
    },
    {
      accessorKey: "description",
      header: "Description / Address",
      cell: ({ row }) => <span className="text-xs text-muted-foreground truncate max-w-[200px]">{row.getValue("description") || "-"}</span>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/20 hover:bg-primary/5 text-primary" asChild>
                <a href={`tel:${row.original.phone_number}`}>Call Now</a>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (confirm('Are you sure you want to delete this contact?')) {
                  deleteContact(row.original.id);
                }
              }}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return <div className="p-8 text-center">Loading directory...</div>;
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Emergency Directory"
        description="Consolidated quick-dial list for local authorities, healthcare, and critical utility support."
        actions={
          <AddEmergencyContactDialog onSuccess={fetchContacts} />
        }
      />

      <div className="grid gap-6 md:grid-cols-4">
        {[
          { label: "Public Police", color: "bg-critical", icon: ShieldAlert },
          { label: "Fire Services", color: "bg-orange-500", icon: ShieldAlert },
          { label: "Emergency Med", color: "bg-success", icon: ShieldAlert },
          { label: "Local Utilities", color: "bg-info", icon: ShieldAlert },
        ].map((card, i) => (
            <Card key={i} className="border-none shadow-card ring-1 ring-border p-4 hover:shadow-md transition-shadow cursor-pointer group">
                <div className="flex items-center justify-between">
                     <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center text-white shadow-lg", card.color)}>
                        <card.icon className="h-5 w-5" />
                     </div>
                     <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
                <div className="mt-4 flex flex-col items-start">
                    <span className="text-sm font-bold ">{card.label}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Quick Dial</span>
                </div>
            </Card>
        ))}
      </div>

      <div className="flex items-center gap-4 py-2">
          <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search services..." className="pl-10 h-10 border-none shadow-premium ring-1 ring-border focus-visible:ring-primary/20" />
          </div>
          <div className="flex gap-2">
              <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted border-none bg-muted/50 font-bold">All</Badge>
              <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted border-none font-bold">Healthcare</Badge>
              <Badge variant="outline" className="px-3 py-1 cursor-pointer hover:bg-muted border-none font-bold">Government</Badge>
          </div>
      </div>

      <DataTable columns={columns} data={contacts} searchKey="contact_name" />
    </div>
  );
}
