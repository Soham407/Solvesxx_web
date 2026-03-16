"use client";

import { useState } from "react";
import { useEmergencyContacts, EmergencyContact } from "@/hooks/useEmergencyContacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

interface AddEmergencyContactDialogProps {
  onSuccess?: () => void;
}

export function AddEmergencyContactDialog({ onSuccess }: AddEmergencyContactDialogProps) {
  const { addContact } = useEmergencyContacts();
  const [isOpen, setIsOpen] = useState(false);
  const [newContact, setNewContact] = useState<Partial<EmergencyContact>>({
    contact_name: "",
    contact_type: "other",
    phone_number: "",
    priority: 1,
    is_active: true,
  });

  const handleAdd = async () => {
    if (!newContact.contact_name || !newContact.phone_number) return;
    
    try {
      await addContact({
        contact_name: newContact.contact_name,
        contact_type: newContact.contact_type || "other",
        phone_number: newContact.phone_number,
        priority: newContact.priority || 1,
        description: newContact.description || null,
        is_active: true,
        society_id: null, // Global or current society context handled by hook/RLS
      });
      setIsOpen(false);
      setNewContact({
        contact_name: "",
        contact_type: "other",
        phone_number: "",
        priority: 1,
        is_active: true,
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Add Emergency Contact
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Emergency Contact</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newContact.contact_name}
              onChange={(e) => setNewContact({ ...newContact, contact_name: e.target.value })}
              placeholder="e.g. Local Police Station"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={newContact.contact_type}
              onValueChange={(val) => setNewContact({ ...newContact, contact_type: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="police">Police</SelectItem>
                <SelectItem value="ambulance">Ambulance</SelectItem>
                <SelectItem value="fire">Fire Brigade</SelectItem>
                <SelectItem value="lift_support">Lift Support</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={newContact.phone_number}
              onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
              placeholder="+91 100"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={newContact.description || ""}
              onChange={(e) => setNewContact({ ...newContact, description: e.target.value })}
              placeholder="e.g. For North Gate"
            />
          </div>
        </div>
        <Button onClick={handleAdd}>Save Contact</Button>
      </DialogContent>
    </Dialog>
  );
}
