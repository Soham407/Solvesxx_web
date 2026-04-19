"use client";

import { useState } from "react";
import { Plus, Download, Filter, MoreHorizontal, UserPlus, Loader2, AlertCircle, RefreshCw, UserX, Trash2 } from "lucide-react";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoleTag } from "@/components/shared/RoleTag";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ColumnDef } from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useEmployees, Employee } from "@/hooks/useEmployees";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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

export default function EmployeesPage() {
  const { employees, isLoading, error, refresh } = useEmployees({ includeInactive: true });
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const openStatusDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsStatusDialogOpen(true);
  };

  const openDeleteDialog = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteConfirmationName("");
    setIsDeleteDialogOpen(true);
  };

  const handleToggleEmployeeStatus = async () => {
    if (!selectedEmployee) return;
    setIsSubmittingAction(true);
    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !selectedEmployee.is_active }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update employee");
      }
      toast.success(selectedEmployee.is_active ? "Employee deactivated" : "Employee activated");
      setIsStatusDialogOpen(false);
      setSelectedEmployee(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update employee");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    setIsSubmittingAction(true);
    try {
      const response = await fetch(`/api/admin/employees/${selectedEmployee.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm_name: deleteConfirmationName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete employee");
      }
      toast.success("Employee deleted permanently");
      setIsDeleteDialogOpen(false);
      setSelectedEmployee(null);
      setDeleteConfirmationName("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete employee");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "full_name",
      header: "Employee",
      cell: ({ row }) => {
        const emp = row.original;
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={emp.photo_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                {emp.full_name?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() || "UN"}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-semibold text-sm">{emp.full_name}</span>
              <span className="text-xs text-muted-foreground">{emp.employee_code || emp.id.substring(0, 8)}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.getValue("email") || <span className="text-muted-foreground italic">No Email</span>
    },
    {
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => row.getValue("department") || "Unassigned"
    },
    {
      accessorKey: "designation_name",
      header: "Role",
      cell: ({ row }) => <RoleTag role={row.original.designation_name || "Employee"} />,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.is_active ? "Active" : "Inactive"} />,
    },
    {
      accessorKey: "date_of_joining",
      header: "Joined Date",
      cell: ({ row }) => {
        if (!row.original.date_of_joining) return "N/A";
        return new Date(row.original.date_of_joining).toLocaleDateString();
      }
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
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={`/company/employees/${row.original.id}`}>View Details</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
                  <Link href={`/company/employees/${row.original.id}?tab=compensation`}>
                Manage Payroll Setup
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>Edit Employee</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openStatusDialog(row.original)}>
              <UserX className="mr-2 h-4 w-4" />
              {row.original.is_active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => openDeleteDialog(row.original)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="module-header">
          <h1 className="module-title">Employees</h1>
          <p className="module-description">Manage and monitor all your enterprise personnel.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button className="gap-2 shadow-md" asChild>
             <Link href="/company/employees/create">
                <UserPlus className="h-4 w-4" />
                Add Employee
             </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="p-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/10">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={employees} 
            searchKey="full_name" 
          />
        )}
      </div>

      <AlertDialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedEmployee?.is_active ? "Deactivate employee?" : "Activate employee?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedEmployee?.is_active
                ? `This will disable app access for ${selectedEmployee?.full_name} and mark linked guard access inactive where applicable.`
                : `This will restore access for ${selectedEmployee?.full_name} and reactivate linked login state where applicable.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleEmployeeStatus} disabled={isSubmittingAction}>
              {isSubmittingAction ? "Saving..." : selectedEmployee?.is_active ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This is destructive and only works when the employee has no linked login, no guard profile, and no operational history.
              Type <span className="font-semibold text-foreground">{selectedEmployee?.full_name || "the employee name"}</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Input
              value={deleteConfirmationName}
              onChange={(event) => setDeleteConfirmationName(event.target.value)}
              placeholder={selectedEmployee?.full_name || "Employee name"}
            />
            <p className="text-xs text-muted-foreground">
              Use deactivate for normal offboarding. Permanent delete is only for mistaken records with no history.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEmployee}
              disabled={
                isSubmittingAction ||
                deleteConfirmationName.trim() !== (selectedEmployee?.full_name || "")
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmittingAction ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
