"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Globe,
  Lock,
  Mail,
  Shield,
} from "lucide-react";

import { BrandLogo } from "@/components/branding/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";
import {
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  BRAND_PORTAL_LABEL,
  BRAND_TAGLINE,
} from "@/src/lib/brand";

type UserAuthRow = {
  must_change_password?: boolean | null;
  roles?: { role_name?: string | null } | null;
};

const createContainerVariants = (prefersReducedMotion: boolean) => ({
  hidden: { opacity: prefersReducedMotion ? 1 : 0 },
  visible: {
    opacity: 1,
    transition: prefersReducedMotion
      ? { duration: 0 }
      : {
          staggerChildren: 0.1,
          delayChildren: 0.15,
        },
  },
});

const createItemVariants = (prefersReducedMotion: boolean) => ({
  hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion
      ? { duration: 0 }
      : {
          duration: 0.45,
          ease: "easeOut" as const,
        },
  },
});

const trustPoints = [
  {
    title: "Integrated operations",
    body: "Manage workforce, procurement, service delivery, and compliance from one SOLVESXX workspace.",
  },
  {
    title: "Controlled access",
    body: "Every login is role-scoped for buyers, suppliers, guards, managers, and internal teams.",
  },
  {
    title: "Brochure-grade polish",
    body: "A cleaner, more premium interface aligned with the SOLVESXX brand system.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const prefersReducedMotion = useReducedMotion() ?? false;

  const containerVariants = createContainerVariants(prefersReducedMotion);
  const itemVariants = createItemVariants(prefersReducedMotion);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (data.user) {
        const { data: userData } = await supabase
          .from("users")
          .select("roles(role_name), must_change_password")
          .eq("id", data.user.id)
          .single();

        const authRow = userData as UserAuthRow | null;

        if (authRow?.must_change_password) {
          router.push("/change-password");
          return;
        }

        const userRole = authRow?.roles?.role_name;

        const roleRedirects: Record<string, string> = {
          buyer: "/buyer",
          supplier: "/supplier",
          vendor: "/supplier",
          resident: "/resident",
          delivery_boy: "/delivery",
          security_guard: "/guard",
          security_supervisor: "/guard",
        };

        toast.success(`Welcome to ${BRAND_NAME}.`);
        router.push(roleRedirects[userRole] ?? "/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast.error(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="brand-shell relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-48 w-48 rounded-br-[6rem] bg-primary" />
        <div className="absolute right-0 top-0 h-44 w-44 rounded-bl-[5rem] bg-[linear-gradient(145deg,#c3a257,#f2e08a)]" />
        <div className="absolute bottom-0 right-0 h-52 w-52 rounded-tl-[6rem] bg-primary/90" />
        <div className="absolute bottom-10 left-10 h-48 w-48 rounded-full bg-warning/20 blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 mx-auto grid max-w-6xl items-stretch gap-8 lg:grid-cols-[1.05fr_0.95fr]"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.section
          variants={itemVariants}
          className="brand-navy-panel brand-cut-corner hidden min-h-[720px] flex-col justify-between rounded-[2rem] p-10 shadow-[0_30px_90px_-44px_rgba(10,63,99,0.68)] lg:flex"
        >
          <div>
            <div className="inline-flex rounded-[2rem] bg-white px-5 py-4 shadow-xl">
              <BrandLogo className="w-28" priority />
            </div>
            <div className="mt-8 max-w-lg">
              <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-sidebar-primary/90">
                {BRAND_LEGAL_NAME}
              </p>
              <h1 className="mt-4 text-5xl font-semibold leading-[0.96] text-white">
                Secure access to the
                <br />
                {BRAND_NAME} portal.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/78">
                {BRAND_TAGLINE}. Sign in with your assigned credentials to continue
                into workforce operations, procurement, service tracking, and facility
                compliance workflows.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {trustPoints.map((point) => (
              <div
                key={point.title}
                className="rounded-[1.35rem] border border-white/12 bg-white/8 px-5 py-4 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#c3a257,#f2e08a)] text-primary shadow-lg">
                    <Shield className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-semibold text-white">{point.title}</p>
                </div>
                <p className="text-sm leading-relaxed text-white/72">{point.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          variants={itemVariants}
          className="brand-surface brand-cut-corner relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-10"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#c3a257,#f2e08a)]" />
          <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-warning/18 blur-3xl" />

          <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="w-fit rounded-[1.75rem] bg-secondary p-4 ring-1 ring-border/70">
              <BrandLogo className="w-20 sm:w-24" priority />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-warning">
                {BRAND_PORTAL_LABEL}
              </p>
              <h2 className="mt-2 text-4xl font-semibold text-primary">
                Sign in to {BRAND_NAME}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Use your corporate email and password to access your role-based
                workspace. Each sign-in routes you directly to the tools you use
                every day.
              </p>
            </div>
          </div>

          <motion.form
            onSubmit={handleLogin}
            className="space-y-5"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80"
              >
                Corporate Email
              </Label>
              <div className="group relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-2xl border-border/80 bg-white pl-10 shadow-sm focus-visible:border-warning focus-visible:ring-warning/35"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80"
                >
                  Password
                </Label>
                <span
                  className="text-xs font-medium text-muted-foreground"
                  title="Contact your administrator for password assistance"
                >
                  Contact Admin for recovery
                </span>
              </div>
              <div className="group relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-2xl border-border/80 bg-white pl-10 shadow-sm focus-visible:border-warning focus-visible:ring-warning/35"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="h-12 w-full rounded-2xl text-base font-semibold"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Verifying access...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    Enter Workspace
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                )}
              </Button>
            </motion.div>
          </motion.form>

          <div className="my-8 flex items-center gap-4 text-muted-foreground">
            <div className="brand-gold-divider flex-1" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">
              Alternate access
            </span>
            <div className="brand-gold-divider flex-1" />
          </div>

          <TooltipProvider>
            <motion.div
              variants={itemVariants}
              className="grid gap-3 sm:grid-cols-2"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    disabled
                    className="h-11 justify-center gap-2 rounded-2xl border-border/80 bg-background"
                    aria-label="SSO login - Coming soon"
                  >
                    <Building2 className="h-4 w-4 text-primary" />
                    SSO
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming soon</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    disabled
                    className="h-11 justify-center gap-2 rounded-2xl border-border/80 bg-background"
                    aria-label="Azure AD login - Coming soon"
                  >
                    <Globe className="h-4 w-4 text-primary" />
                    Azure
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Coming soon</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          </TooltipProvider>

          <motion.div
            variants={itemVariants}
            className="mt-10 rounded-[1.5rem] border border-border/70 bg-secondary/55 px-5 py-4"
          >
            <p className="text-sm font-semibold text-primary">
              Trusted access for buyers, suppliers, guards, and operational teams.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Need help? Reach out to your internal administrator for provisioning,
              resets, or role updates.
            </p>
          </motion.div>

          <motion.p
            variants={itemVariants}
            className="mt-8 text-center text-xs text-muted-foreground"
          >
            &copy; {new Date().getFullYear()} {BRAND_NAME}. {BRAND_LEGAL_NAME}.
          </motion.p>
        </motion.section>
      </motion.div>
    </div>
  );
}
