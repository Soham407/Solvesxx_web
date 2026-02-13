"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Truck, 
  Star, 
  Phone, 
  Mail, 
  Box, 
  Receipt, 
  MoreHorizontal,
  BadgeCheck,
  Building,
  Search,
  Loader2,
  RefreshCw,
  Edit,
  UserX,
  ShieldCheck,
  ShieldX,
  TrendingUp,
  Crown,
  Medal,
  Award
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSuppliers } from "@/hooks/useSuppliers";
import { 
  SupplierExtended, 
  CreateSupplierForm, 
  SupplierStatus, 
  SupplierType,
  canTransitionSupplierStatus 
} from "@/src/types/phaseD";
import {
  SUPPLIER_STATUS,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_STATUS_BADGE_CLASSES,
  SUPPLIER_TYPE,
  SUPPLIER_TYPE_LABELS,
  SUPPLIER_TYPE_ICONS,
  SUPPLIER_TIER,
  SUPPLIER_TIER_LABELS,
  SUPPLIER_TIER_BADGE_CLASSES,
  INDIAN_STATES,
} from "@/src/lib/constants";

export default function SuppliersPage() {
  const {
    suppliers,
    stats,
    isLoading,
    error,
    filters,
    setFilters,
    refresh,
    createSupplier,
    updateSupplier,
    updateStatus,
    updateTier,
    verifySupplier,
    deleteSupplier,
  } = useSuppliers();

  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierExtended | null>(null);
  const [newStatus, setNewStatus] = useState<SupplierStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<CreateSupplierForm>({
    supplier_name: "",
    supplier_type: undefined,
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_number: "",
    pan_number: "",
    payment_terms: 30,
    credit_limit: 0,
  });

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, searchTerm });
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      supplier_name: "",
      supplier_type: undefined,
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gst_number: "",
      pan_number: "",
      payment_terms: 30,
      credit_limit: 0,
    });
  };

  // Handle create supplier
  const handleCreateSupplier = async () => {
    if (!formData.supplier_name) return;
    
    setIsSubmitting(true);
    const result = await createSupplier(formData);
    setIsSubmitting(false);
    
    if (result.success) {
      setCreateDialogOpen(false);
      resetForm();
    }
  };

  // Handle update supplier
  const handleUpdateSupplier = async () => {
    if (!selectedSupplier) return;
    
    setIsSubmitting(true);
    const result = await updateSupplier(selectedSupplier.id, formData);
    setIsSubmitting(false);
    
    if (result.success) {
      setEditDialogOpen(false);
      setSelectedSupplier(null);
      resetForm();
    }
  };

  // Handle status change
  const handleStatusChange = async () => {
    if (!selectedSupplier || !newStatus) return;
    
    setIsSubmitting(true);
    const result = await updateStatus(selectedSupplier.id, newStatus);
    setIsSubmitting(false);
    
    if (result.success) {
      setStatusDialogOpen(false);
      setSelectedSupplier(null);
      setNewStatus(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (supplier: SupplierExtended) => {
    setSelectedSupplier(supplier);
    setFormData({
      supplier_name: supplier.supplier_name,
      supplier_type: supplier.supplier_type || undefined,
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      pincode: supplier.pincode || "",
      gst_number: supplier.gst_number || "",
      pan_number: supplier.pan_number || "",
      payment_terms: supplier.payment_terms || 30,
      credit_limit: supplier.credit_limit || 0,
    });
    setEditDialogOpen(true);
  };

  // Open status dialog
  const openStatusDialog = (supplier: SupplierExtended, status: SupplierStatus) => {
    setSelectedSupplier(supplier);
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  // Get tier icon
  const getTierIcon = (tier: number | null | undefined) => {
    switch (tier) {
      case 1: return <Crown className="h-3.5 w-3.5" />;
      case 2: return <Medal className="h-3.5 w-3.5" />;
      default: return <Award className="h-3.5 w-3.5" />;
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Table columns
  const columns: ColumnDef<SupplierExtended>[] = [
    {
      accessorKey: "supplier_name",
      header: "Supplier / Vendor",
      cell: ({ row }) => (
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10">
            <Building className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm">{row.original.supplier_name}</span>
              {row.original.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-info" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">
                {row.original.supplier_code || `SUP-${row.original.id.slice(0, 8)}`}
              </span>
              {row.original.supplier_type && (
                <Badge variant="outline" className="h-4 px-1.5 py-0 text-[8px] uppercase font-medium">
                  {SUPPLIER_TYPE_LABELS[row.original.supplier_type]}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "contact_person",
      header: "Contact",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          {row.original.contact_person && (
            <span className="text-sm font-medium">{row.original.contact_person}</span>
          )}
          {row.original.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {row.original.phone}
            </div>
          )}
          {row.original.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {row.original.email}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "tier",
      header: "Tier",
      cell: ({ row }) => {
        const tier = row.original.tier || 3;
        return (
          <Badge variant="outline" className={cn("gap-1", SUPPLIER_TIER_BADGE_CLASSES[tier as 1 | 2 | 3])}>
            {getTierIcon(tier)}
            {SUPPLIER_TIER_LABELS[tier as 1 | 2 | 3]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const rating = row.original.rating || row.original.overall_score;
        return (
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            <span className="text-sm font-bold">{rating ? rating.toFixed(1) : "N/A"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "payment_terms",
      header: "Terms",
      cell: ({ row }) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{row.original.payment_terms || 30} days</span>
          <span className="text-[10px] text-muted-foreground">
            Credit: {formatCurrency(row.original.credit_limit)}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = (row.original.status || (row.original.is_active ? 'active' : 'inactive')) as SupplierStatus;
        return (
          <Badge 
            variant="outline" 
            className={cn("font-bold text-[10px] uppercase h-5", SUPPLIER_STATUS_BADGE_CLASSES[status])}
          >
            {SUPPLIER_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const supplier = row.original;
        const currentStatus = (supplier.status || (supplier.is_active ? 'active' : 'inactive')) as SupplierStatus;
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openEditDialog(supplier)} className="gap-2">
                <Edit className="h-3.5 w-3.5" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Box className="h-3.5 w-3.5" /> View Products
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2">
                <Receipt className="h-3.5 w-3.5" /> View Rates
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              {/* Verification */}
              {!supplier.is_verified && (
                <DropdownMenuItem 
                  onClick={() => verifySupplier(supplier.id, true)} 
                  className="gap-2 text-success"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Verify Supplier
                </DropdownMenuItem>
              )}
              {supplier.is_verified && (
                <DropdownMenuItem 
                  onClick={() => verifySupplier(supplier.id, false)} 
                  className="gap-2"
                >
                  <ShieldX className="h-3.5 w-3.5" /> Remove Verification
                </DropdownMenuItem>
              )}
              
              {/* Status transitions */}
              {canTransitionSupplierStatus(currentStatus, 'active') && (
                <DropdownMenuItem 
                  onClick={() => openStatusDialog(supplier, 'active')} 
                  className="gap-2 text-success"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Activate
                </DropdownMenuItem>
              )}
              {canTransitionSupplierStatus(currentStatus, 'inactive') && (
                <DropdownMenuItem 
                  onClick={() => openStatusDialog(supplier, 'inactive')} 
                  className="gap-2"
                >
                  <UserX className="h-3.5 w-3.5" /> Deactivate
                </DropdownMenuItem>
              )}
              {canTransitionSupplierStatus(currentStatus, 'blacklisted') && (
                <DropdownMenuItem 
                  onClick={() => openStatusDialog(supplier, 'blacklisted')} 
                  className="gap-2 text-destructive"
                >
                  <ShieldX className="h-3.5 w-3.5" /> Blacklist
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="gap-2 text-primary font-bold">
                <Truck className="h-3.5 w-3.5" /> Raise Indent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={refresh} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8 pb-20">
      <PageHeader
        title="Supplier Master"
        description="Comprehensive repository of verified vendors, service categories, and performance ratings."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Onboard Supplier
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{stats?.totalSuppliers || 0}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Total</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-success">{stats?.activeSuppliers || 0}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Active</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-info">{stats?.verifiedSuppliers || 0}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Verified</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-info/10 flex items-center justify-center">
                <BadgeCheck className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-warning">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-warning">{stats?.pendingVerification || 0}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Pending</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-card ring-1 ring-border border-l-4 border-l-critical">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-critical">{stats?.blacklistedSuppliers || 0}</span>
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Blacklisted</span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-critical/10 flex items-center justify-center">
                <ShieldX className="h-5 w-5 text-critical" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, contact, GST..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        <Select 
          value={filters.status || "all"} 
          onValueChange={(val) => setFilters({ ...filters, status: val as SupplierStatus | 'all' })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="pending_verification">Pending</SelectItem>
            <SelectItem value="blacklisted">Blacklisted</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.supplier_type || "all"} 
          onValueChange={(val) => setFilters({ ...filters, supplier_type: val as SupplierType | 'all' })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="manufacturer">Manufacturer</SelectItem>
            <SelectItem value="distributor">Distributor</SelectItem>
            <SelectItem value="wholesaler">Wholesaler</SelectItem>
            <SelectItem value="retailer">Retailer</SelectItem>
            <SelectItem value="service_provider">Service Provider</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.tier?.toString() || "all"} 
          onValueChange={(val) => setFilters({ ...filters, tier: val === "all" ? "all" : parseInt(val) })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="1">Platinum</SelectItem>
            <SelectItem value="2">Gold</SelectItem>
            <SelectItem value="3">Silver</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Suppliers Table */}
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardHeader className="border-b">
          <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
            <Building className="h-4 w-4 text-primary" /> Supplier Directory
          </CardTitle>
          <CardDescription>
            {suppliers.length} suppliers found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {suppliers.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed rounded-2xl bg-muted/20">
              <Building className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <CardDescription>No suppliers found matching your filters</CardDescription>
            </div>
          ) : (
            <DataTable columns={columns} data={suppliers} searchKey="supplier_name" />
          )}
        </CardContent>
      </Card>

      {/* Create Supplier Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Onboard New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to the system. All fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier_name">Supplier Name *</Label>
                <Input
                  id="supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Enter supplier name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier_type">Supplier Type</Label>
                <Select 
                  value={formData.supplier_type || ""} 
                  onValueChange={(val) => setFormData({ ...formData, supplier_type: val as SupplierType })}
                >
                  <SelectTrigger id="supplier_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="service_provider">Service Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="supplier@example.com"
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select 
                  value={formData.state || ""} 
                  onValueChange={(val) => setFormData({ ...formData, state: val })}
                >
                  <SelectTrigger id="state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="XXXXXX"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Tax Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                  placeholder="AAAAA0000A"
                  maxLength={10}
                />
              </div>
            </div>

            {/* Business Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_terms">Payment Terms (days)</Label>
                <Input
                  id="payment_terms"
                  type="number"
                  min="0"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credit_limit">Credit Limit (₹)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSupplier} disabled={isSubmitting || !formData.supplier_name}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Same form fields as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_supplier_name">Supplier Name *</Label>
                <Input
                  id="edit_supplier_name"
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_supplier_type">Supplier Type</Label>
                <Select 
                  value={formData.supplier_type || ""} 
                  onValueChange={(val) => setFormData({ ...formData, supplier_type: val as SupplierType })}
                >
                  <SelectTrigger id="edit_supplier_type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
                    <SelectItem value="retailer">Retailer</SelectItem>
                    <SelectItem value="service_provider">Service Provider</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_contact_person">Contact Person</Label>
                <Input
                  id="edit_contact_person"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input
                  id="edit_phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_email">Email</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_address">Address</Label>
              <Textarea
                id="edit_address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_city">City</Label>
                <Input
                  id="edit_city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_state">State</Label>
                <Select 
                  value={formData.state || ""} 
                  onValueChange={(val) => setFormData({ ...formData, state: val })}
                >
                  <SelectTrigger id="edit_state">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {INDIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_pincode">Pincode</Label>
                <Input
                  id="edit_pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  maxLength={6}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_gst_number">GST Number</Label>
                <Input
                  id="edit_gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_pan_number">PAN Number</Label>
                <Input
                  id="edit_pan_number"
                  value={formData.pan_number}
                  onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                  maxLength={10}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_payment_terms">Payment Terms (days)</Label>
                <Input
                  id="edit_payment_terms"
                  type="number"
                  min="0"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_credit_limit">Credit Limit (₹)</Label>
                <Input
                  id="edit_credit_limit"
                  type="number"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setSelectedSupplier(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSupplier} disabled={isSubmitting || !formData.supplier_name}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change the status of {selectedSupplier?.supplier_name} to{" "}
              <strong>{newStatus ? SUPPLIER_STATUS_LABELS[newStatus] : ""}</strong>?
            </DialogDescription>
          </DialogHeader>
          
          {newStatus === 'blacklisted' && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                Warning: Blacklisting a supplier will prevent them from being used for future orders. 
                This action can be reversed but requires additional approval.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setStatusDialogOpen(false); setSelectedSupplier(null); setNewStatus(null); }}>
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange} 
              disabled={isSubmitting}
              variant={newStatus === 'blacklisted' ? 'destructive' : 'default'}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
