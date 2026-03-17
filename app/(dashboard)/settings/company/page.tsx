"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Save, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/src/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

export default function CompanySettingsPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const canEditSecurity = role === "admin" || role === "super_admin";

  const [inactivityThreshold, setInactivityThreshold] = useState<number>(30);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoadingConfig(true);
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "guard_inactivity_threshold_minutes")
        .single();

      if (!error && data) {
        setInactivityThreshold(Number(data.value));
      } else if (error && error.code !== "PGRST116") {
        setConfigError("Failed to load security configuration.");
      }
      setIsLoadingConfig(false);
    };

    fetchConfig();
  }, []);

  const handleSaveInactivityThreshold = async () => {
    if (inactivityThreshold < 5 || inactivityThreshold > 120) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("system_config")
        .update({
          value: String(inactivityThreshold),
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("key", "guard_inactivity_threshold_minutes");

      if (error) throw error;
      toast({ title: "Settings saved", description: "Guard inactivity threshold updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Company Settings"
        description="Configure company identity, security policies, and system behaviour."
      />

      {configError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{configError}</AlertDescription>
        </Alert>
      )}

      {/* Security Settings */}
      {canEditSecurity && (
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Security Settings</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Configure guard monitoring and alert thresholds.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase">
                  Guard Inactivity Alert Threshold
                </Label>
                {isLoadingConfig ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={inactivityThreshold}
                    onChange={(e) => setInactivityThreshold(Number(e.target.value))}
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Guards who do not move for this many minutes will trigger an inactivity alert. (5–120 min)
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveInactivityThreshold}
                disabled={isSaving || isLoadingConfig || inactivityThreshold < 5 || inactivityThreshold > 120}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Security Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!canEditSecurity && (
        <Card className="border-none shadow-card ring-1 ring-border">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            You do not have permission to modify company settings.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
