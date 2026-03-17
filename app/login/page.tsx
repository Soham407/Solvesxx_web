// @ts-nocheck
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Shield, Lock, Mail, ArrowRight, Building2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/src/lib/supabaseClient";

// Stagger animation variants - respects reduced motion preference
const createContainerVariants = (prefersReducedMotion: boolean) => ({
  hidden: { opacity: prefersReducedMotion ? 1 : 0 },
  visible: {
    opacity: 1,
    transition: prefersReducedMotion 
      ? { duration: 0 }
      : {
          staggerChildren: 0.1,
          delayChildren: 0.2,
        },
  },
});

const createItemVariants = (prefersReducedMotion: boolean) => ({
  hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: prefersReducedMotion 
      ? { duration: 0 }
      : {
          duration: 0.5,
          ease: "easeOut" as const,
        },
  },
});

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [blockedByLimit, setBlockedByLimit] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  
  const containerVariants = createContainerVariants(prefersReducedMotion);
  const itemVariants = createItemVariants(prefersReducedMotion);

  const getIp = async () => {
    try {
      const res = await fetch("/api/auth/client-ip");
      const data = await res.json();
      return data.ip ?? "127.0.0.1";
    } catch {
      return "127.0.0.1";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const ip = await getIp();

    // 1. Check if blocked
    const { data: blockData } = await supabase.rpc("proc_check_login_blocked" as any, { p_ip: ip });
    if (blockData && blockData[0]?.is_blocked) {
      const until = new Date(blockData[0].blocked_until_time);
      setBlockedByLimit(true);
      setBlockedUntil(until);
      toast.error(`Too many attempts. You are blocked until ${until.toLocaleTimeString()}.`);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 2. Record failure
        const { data: updateData } = await supabase.rpc("proc_handle_login_attempt" as any, { 
          p_ip: ip, 
          p_is_failure: true 
        });
        
        const firstResult = Array.isArray(updateData) ? updateData[0] : null;
        if (firstResult && (firstResult as any).is_blocked) {
          const until = new Date((firstResult as any).blocked_until_time);
          setBlockedByLimit(true);
          setBlockedUntil(until);
          toast.error(`Account locked due to consecutive failures. Blocked until ${until.toLocaleTimeString()}.`);
        } else {
          const remaining = (firstResult as any)?.remaining_attempts ?? 5;
          toast.error(`Invalid credentials. ${remaining} attempts remaining before lockout.`);
        }
        
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // 3. Record success (reset)
        await supabase.rpc("proc_handle_login_attempt" as any, { 
          p_ip: ip, 
          p_is_failure: false 
        });
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#070a0f]">
      {/* Background Decorative Elements - animations disabled for reduced motion */}
      <div className="absolute inset-0">
        {/* Gradient orbs - only animate if user doesn't prefer reduced motion */}
        <div className={`absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px] ${prefersReducedMotion ? '' : 'animate-pulse-glow'}`} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-accent-secondary/15 rounded-full blur-[150px]" />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-accent-tertiary/10 rounded-full blur-[120px]" />
        
        {/* Inline noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <motion.div 
        className="relative z-10 w-full max-w-md px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo Section */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col items-center mb-8"
        >
          <motion.div 
            className="h-16 w-16 bg-primary rounded-2xl shadow-glow-lg flex items-center justify-center mb-4 border border-white/10"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Shield className="h-8 w-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FacilityPro</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-[0.2em] font-medium">
            Enterprise Cloud Suite
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div variants={itemVariants}>
          <Card className="border-white/5 bg-white/[0.03] backdrop-blur-xl shadow-2xl overflow-hidden relative">
            {/* Multi-color gradient top border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-500 to-accent-secondary" />
            
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-2xl text-white font-bold text-center tracking-tight">
                Identity Portal
              </CardTitle>
              <CardDescription className="text-gray-400 text-center pt-2">
                Secure access for authorized personnel only
              </CardDescription>
            </CardHeader>
            
            <CardContent>
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
                    className="text-gray-300 text-xs font-semibold uppercase tracking-wider"
                  >
                    Corporate Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white pl-10 h-11 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all placeholder:text-gray-500"
                    />
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-gray-300 text-xs font-semibold uppercase tracking-wider"
                    >
                      Password
                    </Label>
                    <span
                      className="text-gray-500 text-xs font-medium cursor-not-allowed"
                      title="Contact your administrator for password assistance"
                    >
                      Forgot Access? Contact Admin
                    </span>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/5 border-white/10 text-white pl-10 h-11 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all"
                    />
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading || Boolean(blockedByLimit && blockedUntil && blockedUntil > new Date())}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-semibold text-base shadow-glow group transition-all duration-300"
                  >
                    {blockedByLimit && blockedUntil && blockedUntil > new Date() ? (
                        <div className="flex items-center gap-2">
                           <Lock className="h-4 w-4" /> Locked Out
                        </div>
                    ) : isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        Sign In
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            </CardContent>
            
            <CardFooter className="pb-8 flex flex-col items-center gap-4">
              <motion.div 
                variants={itemVariants}
                className="flex items-center gap-4 text-gray-500"
              >
                <div className="h-px w-8 bg-white/10" />
                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold">
                  Or authenticate with
                </span>
                <div className="h-px w-8 bg-white/10" />
              </motion.div>
              
              <TooltipProvider>
                <motion.div variants={itemVariants} className="flex gap-4 w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        disabled
                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 gap-2 disabled:opacity-50 transition-all"
                        aria-label="SSO login - Coming soon"
                      >
                        <Building2 className="h-4 w-4" />
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
                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 gap-2 disabled:opacity-50 transition-all"
                        aria-label="Azure AD login - Coming soon"
                      >
                        <Globe className="h-4 w-4" />
                        Azure
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coming soon</p>
                    </TooltipContent>
                  </Tooltip>
                </motion.div>
              </TooltipProvider>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          variants={itemVariants}
          className="mt-8 flex flex-col items-center gap-2"
        >
          <p className="text-[10px] text-gray-600 text-center">
            Need help? Contact your system administrator
          </p>
          <p className="text-[10px] text-gray-600">
            &copy; {new Date().getFullYear()} FacilityPro Enterprise
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
