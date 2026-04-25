"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardCheck, Settings, ShieldCheck, MoreHorizontal, HelpCircle, ListTodo, Loader2, AlertCircle, Trash2, Edit } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useChecklists, Checklist } from "@/hooks/useChecklists";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChecklistDialog } from "@/components/dialogs/ChecklistDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ChecklistMasterPage() {
  const { checklists, isLoading, error, deleteChecklist, refresh } = useChecklists();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);

  const handleCreate = () => {
    setSelectedChecklist(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (checklist: Checklist) => {
    setSelectedChecklist(checklist);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to deactivate this checklist?")) {
      await deleteChecklist(id);
    }
  };

  const columns: ColumnDef<Checklist>[] = [
    {
      accessorKey: "checklist_name",
      header: "Checklist Identifier",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm ">{row.original.checklist_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold ">{row.original.checklist_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Assigned Department",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium text-xs">
          {row.getValue("department")}
        </Badge>
      ),
    },
    {
      accessorKey: "questions",
      header: "Schema Length",
      cell: ({ row }) => {
        const questions = row.original.questions || [];
        return (
          <div className="flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-info" />
              <span className="text-sm font-medium">{questions.length} Questions</span>
          </div>
        );
      },
    },
    {
      accessorKey: "frequency",
      header: "Trigger Frequency",
      cell: ({ row }) => (
        <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground capitalize">
            <ListTodo className="h-3 w-3" /> {row.getValue("frequency")}
        </div>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Definition Status",
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return (
          <Badge variant="outline" className={cn("font-bold text-[10px] uppercase h-5", isActive ? "bg-success/10 text-success border-success/20" : "")}>
              {isActive ? "Active" : "Draft"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
             <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary"
              onClick={() => handleEdit(row.original)}
             >
                <Settings className="h-4 w-4" />
             </Button>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(row.original)} className="gap-2">
                    <Edit className="h-4 w-4" /> Edit Configuration
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleDelete(row.original.id)} 
                    className="gap-2 text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" /> Deactivate
                  </DropdownMenuItem>
                </DropdownMenuContent>
             </DropdownMenu>
        </div>
      ),
    },
  ];

  const activeCount = checklists.filter(c => c.is_active).length;
  const draftCount = checklists.filter(c => !c.is_active).length;
  const totalQuestions = checklists.reduce((sum, c) => sum + (c.questions?.length || 0), 0);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Checklist Configuration"
        description="Define routine inspection points and Yes/No/Value questions for various departments."
        actions={
          <Button className="gap-2 shadow-sm" onClick={handleCreate}>
            <Plus className="h-4 w-4" /> Create New Checklist
          </Button>
        }
      />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && (
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { label: "Active Forms", value: activeCount, sub: "Live in guard app", icon: ShieldCheck, color: "text-success" },
            { label: "Questions Defined", value: totalQuestions, sub: "Across all schemas", icon: HelpCircle, color: "text-info" },
            { label: "Pending Drafts", value: draftCount, sub: "Requiring review", icon: Settings, color: "text-warning" },
          ].map((stat, i) => (
              <Card key={i} className="border-none shadow-card ring-1 ring-border p-4">
                 <div className="flex items-center gap-4">
                      <div className={cn("h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
                          <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col text-left">
                          <span className="text-2xl font-bold ">{stat.value}</span>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</span>
                      </div>
                 </div>
              </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
           <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : (
        <DataTable columns={columns} data={checklists} searchKey="checklist_name" />
      )}

      <ChecklistDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        checklist={selectedChecklist}
        onSuccess={refresh}
      />
    </div>
  );
}
