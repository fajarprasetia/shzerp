"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/app/components/ui/header";
import { useTheme } from "next-themes";

interface GlassLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassLayout({ children, className }: GlassLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  
  // After mounting, we have access to the theme
  React.useEffect(() => {
    setMounted(true);
  }, []);
  
  // Use these variables for conditional rendering
  const isDarkTheme = mounted && (resolvedTheme === "dark" || theme === "dark");
  const isLightTheme = mounted && (resolvedTheme === "light" || theme === "light");

  return (
    <div className={cn(
      "relative min-h-screen overflow-x-hidden",
      mounted ? (
        isDarkTheme 
          ? "bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900" 
          : "bg-gradient-to-br from-blue-50/80 via-indigo-50/50 to-sky-50/80"
      ) : "bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900" // Default for SSR
    )}>
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full blur-3xl animate-blob",
          mounted ? (
            isDarkTheme
              ? "bg-gradient-to-br from-blue-500/10 to-violet-500/10"
              : "bg-gradient-to-br from-blue-200/40 to-indigo-300/40"
          ) : "bg-gradient-to-br from-blue-500/10 to-violet-500/10" // Default for SSR
        )} />
        <div className={cn(
          "absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full blur-3xl animate-blob animation-delay-2000",
          mounted ? (
            isDarkTheme
              ? "bg-gradient-to-br from-violet-500/10 to-sky-500/10"
              : "bg-gradient-to-br from-sky-200/40 to-violet-300/40"
          ) : "bg-gradient-to-br from-violet-500/10 to-sky-500/10" // Default for SSR
        )} />
        <div className={cn(
          "absolute top-[20%] right-[20%] w-[50%] h-[50%] rounded-full blur-3xl animate-blob animation-delay-4000",
          mounted ? (
            isDarkTheme
              ? "bg-gradient-to-br from-sky-500/10 to-blue-500/10"
              : "bg-gradient-to-br from-indigo-200/40 to-blue-300/40"
          ) : "bg-gradient-to-br from-sky-500/10 to-blue-500/10" // Default for SSR
        )} />
      </div>

      {/* Content wrapper with glass effect */}
      <div className={cn(
        "relative min-h-screen w-full backdrop-blur-[2px] text-foreground",
        className
      )}>
        <div className={cn(
          "absolute inset-0",
          mounted ? (
            isDarkTheme 
              ? "bg-gray-950/40" 
              : "bg-background/40"
          ) : "bg-gray-950/40" // Default for SSR
        )} />
        
        {/* Layout structure */}
        <div className="relative flex min-h-screen">
          {/* Sidebar */}
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 md:ml-64">
            {/* Header */}
            <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
            
            {/* Main content */}
            <main className="flex-1 p-4 md:p-6">
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
} 