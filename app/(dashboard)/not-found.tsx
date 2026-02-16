import Link from "next/link";
import { FileQuestion, MoveLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-muted/50">
        <FileQuestion className="h-12 w-12 text-muted-foreground opacity-50" />
      </div>
      
      <h2 className="text-3xl font-black tracking-tighter sm:text-4xl mb-2">Module Not Found</h2>
      <p className="max-w-[400px] text-muted-foreground mb-8 leading-relaxed">
        The page you are looking for doesn't exist or has been moved to a different wing of the facility.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button variant="outline" className="gap-2" asChild>
          <Link href="javascript:history.back()">
            <MoveLeft className="h-4 w-4" />
            Go Back
          </Link>
        </Button>
        <Button className="gap-2 shadow-glow" asChild>
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            Return Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
