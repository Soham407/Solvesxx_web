import Image from "next/image";

import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/src/lib/brand";

const LOGO_WIDTH = 614;
const LOGO_HEIGHT = 770;

interface BrandLogoProps {
  className?: string;
  alt?: string;
  priority?: boolean;
}

export function BrandLogo({
  className,
  alt = `${BRAND_NAME} logo`,
  priority = false,
}: BrandLogoProps) {
  return (
    <Image
      src="/Logo.png"
      alt={alt}
      width={LOGO_WIDTH}
      height={LOGO_HEIGHT}
      priority={priority}
      className={cn("h-auto w-full object-contain", className)}
    />
  );
}

export function BrandMark({
  className,
  alt = `${BRAND_NAME} mark`,
  priority = false,
}: BrandLogoProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] bg-[linear-gradient(145deg,#c3a257,#f2e08a)] shadow-lg ring-1 ring-primary/10",
        className,
      )}
    >
      <div className="absolute inset-[5%] rounded-[1.1rem] bg-white/95" />
      <div className="relative h-full w-full p-[12%]">
        <Image
          src="/Logo.png"
          alt={alt}
          fill
          priority={priority}
          className="object-contain p-[10%] drop-shadow-[0_12px_28px_rgba(10,63,99,0.18)]"
          sizes="(max-width: 768px) 64px, 96px"
        />
      </div>
    </div>
  );
}
