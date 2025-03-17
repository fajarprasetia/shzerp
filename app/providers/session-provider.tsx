"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [isAuthPage, setIsAuthPage] = useState(false);
  
  useEffect(() => {
    // Check if we're on an auth page
    if (typeof window !== 'undefined') {
      setIsAuthPage(window.location.pathname.startsWith('/auth/'));
    }
  }, []);
  
  // Don't use SessionProvider on auth pages to avoid unnecessary API calls
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <NextAuthSessionProvider 
      refetchInterval={0} 
      refetchOnWindowFocus={false}
      onError={(error) => {
        // Suppress 401 errors in the console
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          console.debug('Auth session not found (expected on login pages)');
          return;
        }
        console.error('Session error:', error);
      }}
    >
      {children}
    </NextAuthSessionProvider>
  );
} 