"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSignedVisitorPhotoUrl } from "@/lib/visitorPhotoStorage";
import { User } from "lucide-react";

interface VisitorAvatarProps {
  photoUrl?: string | null;
  name: string;
  className?: string;
}

export function VisitorAvatar({ photoUrl, name, className }: VisitorAvatarProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (photoUrl && !photoUrl.startsWith('http')) {
      getSignedVisitorPhotoUrl(photoUrl)
        .then((signedUrl) => {
          if (signedUrl) setUrl(signedUrl);
        })
        .catch((err) => {
          console.error("Error fetching signed URL:", err);
          setUrl(null);
        });
    } else if (photoUrl?.startsWith('http')) {
      setUrl(photoUrl);
    }
  }, [photoUrl]);

  return (
    <Avatar className={className}>
      <AvatarImage src={url || undefined} className="object-cover" />
      <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold uppercase">
        {name.substring(0, 2) || <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  );
}
