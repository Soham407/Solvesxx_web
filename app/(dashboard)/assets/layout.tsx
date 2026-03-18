import type { Metadata } from "next";

export const metadata: Metadata = { title: "Asset Management" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
