"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, MoreHorizontal, AlertCircle, Edit, Trash2, Shield } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDesignations } from "@/hooks/useDesignations";
import { Designation } from "@/src/types/company";
import { DesignationDialog } from "@/components/dialogs/DesignationDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DesignationsPage() {
  const { 
    designations, 
    isLoading, 
    error, 
    deleteDesignation,
    refresh
  } = useDesignations();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | undefined>(undefined);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [designationToDelete, setDesignationToDelete] = useState<Designation | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const handleEdit = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedDesignation(undefined);
    setIsDialogOpen(true);
  };

  const confirmDelete = (designation: Designation) => {
    setDesignationToDelete(designation);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (designationToDelete) {
      const result = await deleteDesignation(designationToDelete.id);
      if (result.success) {
        setIsDeleteDialogOpen(false);
        setDesignationToDelete(null);
      }
    }
  };

  const filteredData = designations.filter(d => 
    departmentFilter === "all" || d.department === departmentFilter
  );

  const departments = Array.from(new Set(designations.map(d => d.department).filter(Boolean)));

  const columns: ColumnDef<Designation>[] = [
    {
      accessorKey: "designation_name",
      header: "Designation Title",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-sm">{row.original.designation_name}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">{row.original.designation_code}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-muted/30 border-none font-medium">
          {row.getValue("department") || "N/A"}
        </Badge>
      ),
    },
    {
      accessorKey: "level",
      header: "Level",
      cell: ({ row }) => {
        const level = row.original.level;
        if (!level) return <span className="text-xs text-muted-foreground">N/A</span>;
        
        const colors = {
          junior: "bg-blue-500/10 text-blue-600 border-blue-200",
          senior: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
          lead: "bg-amber-500/10 text-amber-600 border-amber-200",
          head: "bg-purple-500/10 text-purple-600 border-purple-200",
        };

        return (
          <Badge variant="outline" className={`${colors[level as keyof typeof colors]} capitalize font-bold text-[10px]`}>
            {level}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${row.original.is_active ? 'bg-success' : 'bg-muted-foreground'}`} />
          <span className="text-sm font-medium">{row.original.is_active ? 'Active' : 'Inactive'}</span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(row.original)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Designation
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => confirmDelete(row.original)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Designation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const filterContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase text-muted-foreground">Department</label>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(dept => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button 
        variant="ghost" 
        size="sm" 
        className="w-full text-xs" 
        onClick={() => setDepartmentFilter("all")}
      >
        Reset Filters
      </Button>
    </div>
  );

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Designation Master"
        description="Official job titles and positions hierarchy within the organization."
        actions={
          <Button className="gap-2 shadow-sm" onClick={handleAdd}>
            <Plus className="h-4 w-4" /> Add Designation
          </Button>
        }
      />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <DataTable 
        columns={columns} 
        data={filteredData} 
        searchKey="designation_name" 
        isLoading={isLoading}
        filterContent={filterContent}
        filterActive={departmentFilter !== "all"}
      />

      <DesignationDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        designation={selectedDesignation}
        onSuccess={refresh}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              <span className="font-bold text-foreground mx-1">
                {designationToDelete?.designation_name}
              </span> 
              designation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
