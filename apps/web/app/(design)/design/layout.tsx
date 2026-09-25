import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { designGalleryEnabled } from "@/lib/dev";

/** Design System V2 review pages — visual review only, never product functionality. */
export default async function DesignLayout({ children }: { children: ReactNode }) {
  await connection();
  if (!designGalleryEnabled()) notFound();
  return children;
}
