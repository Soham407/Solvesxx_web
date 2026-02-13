import { useState } from "react";
import { AddVisitorForm } from "@/components/forms/AddVisitorForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Inside your component, add state for the dialog
export default function VisitorManagementPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // ... rest of your existing code ...

  // Update the PageHeader actions section (around line 124-133) to:
  <PageHeader
    title="Visitor Management"
    description="Monitor real-time visitor movement and guest credentials for the society."
    actions={
      <div className="flex gap-2">
        <Button variant="outline" className="gap-2">
          <HistoryIcon className="h-4 w-4" /> Movement Logs
        </Button>
        
        {/* Replace the existing Quick Entry button with this Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <UserPlus className="h-4 w-4" /> Quick Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Visitor Check-In</DialogTitle>
              <DialogDescription>
                Register a new visitor entering the premises
              </DialogDescription>
            </DialogHeader>
            <AddVisitorForm
              onSuccess={() => {
                setIsDialogOpen(false);
                // TODO: Refresh visitor list here
                // You can add a refresh function to reload the activeVisitors data
              }}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    }
  />

  // ... rest of your component ...
}
