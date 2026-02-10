"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(
          error.message || "Login failed. Please check your credentials.",
        );
        setIsLoading(false);
        return;
      }

      if (data.user) {
        toast.success("Welcome back!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0c10]">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <div className="h-16 w-16 bg-primary rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center mb-4 border border-white/10">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white ">FacilityPro</h1>
          <p className="text-gray-400 text-sm mt-1 uppercase tracking-widest font-semibold">
            Enterprise Cloud Suite
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <Card className="border-white/5 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-primary to-blue-400" />
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-2xl text-white font-bold text-center">
                Identity Portal
              </CardTitle>
              <CardDescription className="text-gray-400 text-center pt-2">
                Secure access for authorized personnel only
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-gray-300 text-xs font-bold uppercase tracking-wider"
                  >
                    Corporate Email
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-black/20 border-white/10 text-white pl-10 h-11 focus-visible:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-gray-300 text-xs font-bold uppercase tracking-wider"
                    >
                      Password
                    </Label>
                    <Button
                      variant="link"
                      className="text-primary text-xs h-auto p-0 font-bold"
                    >
                      Forgot Access?
                    </Button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-black/20 border-white/10 text-white pl-10 h-11 focus-visible:ring-primary/30 transition-all"
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold text-base shadow-lg shadow-primary/20 group"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        Initialize Session
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
            <CardFooter className="pb-8 flex flex-col items-center gap-4">
              <div className="flex items-center gap-4 text-gray-500">
                <div className="h-px w-8 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest font-bold">
                  Or authenticate with
                </span>
                <div className="h-px w-8 bg-white/10" />
              </div>
              <TooltipProvider>
                <div className="flex gap-4 w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        disabled
                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 gap-2 disabled:opacity-50"
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
                        className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10 h-10 gap-2 disabled:opacity-50"
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
                </div>
              </TooltipProvider>
            </CardFooter>
          </Card>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex justify-center gap-6 text-xs font-bold text-gray-500 uppercase tracking-widest"
        >
          <span className="cursor-default" title="Coming soon">
            Security Audit
          </span>
          <span className="cursor-default" title="Coming soon">
            Privacy
          </span>
          <span className="cursor-default" title="Coming soon">
            Contact Support
          </span>
        </motion.div>
      </div>
    </div>
  );
}
