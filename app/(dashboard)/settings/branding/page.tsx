"use client";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Sparkles } from "lucide-react";
import {
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  BRAND_TAGLINE,
} from "@/src/lib/brand";

export default function BrandingSettingsPage() {
  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <PageHeader
        title="Branding"
        description="The portal now ships with a fixed SOLVESXX identity and a single premium light theme."
      />
      <Card className="border-none shadow-card ring-1 ring-border">
        <CardContent className="flex flex-col items-center justify-center gap-5 py-16">
          <div className="w-28 rounded-[1.75rem] bg-secondary p-4 ring-1 ring-border/70">
            <BrandLogo className="w-full" priority />
          </div>
          <Badge className="bg-warning/15 text-warning hover:bg-warning/15">
            Active brand system
          </Badge>
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-semibold text-primary">{BRAND_NAME}</h3>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              {BRAND_LEGAL_NAME}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {BRAND_TAGLINE}. Manual theme switching and white-label controls are
              intentionally disabled for this release.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 rounded-full border border-border/70 bg-muted/35 px-4 py-2">
            <Palette className="h-4 w-4 text-warning" />
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                SOLVESXX Theme Active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
