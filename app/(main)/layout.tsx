"use client";

import { ReactNode } from "react";
import { GlassLayout } from "@/app/components/layout/glass-layout";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <GlassLayout>
      {children}
    </GlassLayout>
  );
} 