"use client";

import { useState } from "react";
import { useEmergencyContacts, EmergencyContact } from "@/hooks/useEmergencyContacts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Trash2, Phone, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmergencyContactListProps {
  societyId?: string;
  canManage?: boolean; // If true, shows add/delete/edit controls
}

export function EmergencyContactList({ societyId, canManage = false }: EmergencyContactListProps) {
  const { contacts, isLoading, addContact, deleteContact } = useEmergencyContacts(societyId);
  const [isAddOpen, setIsAddOpen] = useState(false);
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
        society_id: societyId || null,
      });
      setIsAddOpen(false);
      setNewContact({
        contact_name: "",
        contact_type: "other",
        phone_number: "",
        priority: 1,
        is_active: true,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading contacts...</div>;
  }

  const groupedContacts = contacts.reduce((acc, contact) => {
    const type = contact.contact_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(contact);
    return acc;
  }, {} as Record<string, EmergencyContact[]>);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'police': return '👮';
      case 'ambulance': return '🚑';
      case 'fire': return '🚒';
      case 'lift_support': return '🔧';
      default: return '📞';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Emergency Contacts</h2>
        {canManage && (
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Contact
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
              </div>
              <Button onClick={handleAdd}>Save Contact</Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(groupedContacts).map(([type, items]) => (
          <Card key={type} className="overflow-hidden">
            <CardHeader className="bg-muted/50 pb-2">
              <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                <span>{getIconForType(type)}</span>
                {type.replace('_', ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {items.map((contact) => (
                  <div key={contact.id} className="p-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{contact.contact_name}</span>
                      <a href={`tel:${contact.phone_number}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone_number}
                      </a>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => deleteContact(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {contacts.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-8">
            No emergency contacts found.
          </div>
        )}
      </div>
    </div>
  );
}
