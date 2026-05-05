"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbCrumb = {
  label: string;
  href?: string;
};

const BREADCRUMB_OVERRIDES: Record<string, BreadcrumbCrumb[]> = {
  "/inventory/indents/create": [
    { label: "Inventory", href: "/inventory" },
    { label: "Requests & Approvals", href: "/inventory/requests" },
    { label: "Create" },
  ],
  "/inventory/indents/verification": [
    { label: "Inventory", href: "/inventory" },
    { label: "Requests & Approvals", href: "/inventory/requests" },
    { label: "Verification" },
  ],
};

function humanizeSegment(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function DynamicBreadcrumbs() {
  const pathname = usePathname();

  if (pathname === "/dashboard" || pathname === "/") {
    return null;
  }

  const overrideTrail = BREADCRUMB_OVERRIDES[pathname];
  const trail =
    overrideTrail ||
    pathname
      .split("/")
      .filter((segment) => segment !== "")
      .map((segment, index, segments) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        return {
          label: humanizeSegment(segment),
          href: index === segments.length - 1 ? undefined : href,
        };
      });

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </BreadcrumbSeparator>

        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          const key = crumb.href || `${pathname}-${crumb.label}-${index}`;

          return (
            <React.Fragment key={key}>
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
