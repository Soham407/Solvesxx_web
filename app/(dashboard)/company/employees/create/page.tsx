"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, Save, User, Briefcase, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useEmployees } from "@/hooks/useEmployees";
import { useDesignations } from "@/hooks/useDesignations";

const employeeSchema = z.object({
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Invalid phone number"),
  department: z.string().min(1, "Department is required"),
  designationId: z.string().min(1, "Designation is required"),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

export default function CreateEmployeePage() {
  const router = useRouter();
  const { createEmployee } = useEmployees();
  const { designations, isLoading: designationsLoading } = useDesignations();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
  });

  const onSubmit = async (data: EmployeeFormValues) => {
    const result = await createEmployee({
      first_name: data.firstName,
      last_name: data.lastName,
      email: data.email,
      phone: data.phone,
      department: data.department,
      designation_id: data.designationId,
    });
    if (result.success) {
      toast.success("Employee record created successfully!");
      router.push("/company/employees");
    } else {
      toast.error(result.error || "Failed to create employee");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/company/employees">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold ">Onboard New Employee</h1>
            <p className="text-muted-foreground text-sm">Fill in the details to add a new personnel to the system.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/company/employees">Cancel</Link>
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="gap-2 shadow-md">
            <Save className="h-4 w-4" />
            {isSubmitting ? "Saving..." : "Save Employee"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Personal Details */}
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic contact and identification details.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} placeholder="e.g. Rahul" className={errors.firstName ? "border-critical" : ""} />
              {errors.firstName && <p className="text-xs text-critical font-medium">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} placeholder="e.g. Sharma" className={errors.lastName ? "border-critical" : ""} />
              {errors.lastName && <p className="text-xs text-critical font-medium">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" {...register("email")} placeholder="rahul.sharma@enterprise.com" className={cn("pl-10", errors.email ? "border-critical" : "")} />
              </div>
              {errors.email && <p className="text-xs text-critical font-medium">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="phone" {...register("phone")} placeholder="+91 98765 43210" className={cn("pl-10", errors.phone ? "border-critical" : "")} />
              </div>
              {errors.phone && <p className="text-xs text-critical font-medium">{errors.phone.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              Employment Details
            </CardTitle>
            <CardDescription>Role, department and location assignments.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select onValueChange={(v: string) => setValue("department", v, { shouldValidate: true })}>
                <SelectTrigger className={errors.department ? "border-critical" : ""}>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">Information Technology</SelectItem>
                  <SelectItem value="ops">Operations</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="sec">Security</SelectItem>
                </SelectContent>
              </Select>
              {errors.department && <p className="text-xs text-critical font-medium">{errors.department.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Select onValueChange={(v: string) => setValue("designationId", v, { shouldValidate: true })}>
                <SelectTrigger className={errors.designationId ? "border-critical" : ""}>
                  <SelectValue
                    placeholder={
                      designationsLoading
                        ? "Loading designations..."
                        : "Select Designation"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {designations.map((designation) => (
                    <SelectItem key={designation.id} value={designation.id}>
                      {designation.designation_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.designationId && <p className="text-xs text-critical font-medium">{errors.designationId.message}</p>}
              {!designationsLoading && designations.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add a designation in Company Master before onboarding employees.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 p-6 bg-muted/20 border rounded-xl">
           <p className="text-xs text-muted-foreground mr-auto">
             Note: This creates the employee record with department and designation.
             User provisioning, role assignment, and operational location mapping still happen separately.
           </p>
           <Button variant="outline" type="button" asChild>
             <Link href="/company/employees">Cancel</Link>
           </Button>
           <Button type="submit" disabled={isSubmitting} className="gap-2 px-8">
             <Save className="h-4 w-4" />
             {isSubmitting ? "Processing..." : "Finish Onboarding"}
           </Button>
        </div>
      </form>
    </div>
  );
}
