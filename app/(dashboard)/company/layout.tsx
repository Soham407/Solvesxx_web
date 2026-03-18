import type { Metadata } from "next";

export const metadata: Metadata = { title: "Company Settings" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
