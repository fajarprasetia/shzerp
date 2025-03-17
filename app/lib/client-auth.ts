'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Custom hook to check if the user is authenticated on the client side
 */
export function useIsAuthenticated() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Don't check authentication on the login page
    if (typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname.startsWith('/auth/');
      
      if (isLoginPage) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
    }

    const checkAuth = async () => {
      try {
        // Make a request to a protected API endpoint
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          next: { revalidate: 0 },
        });
        
        // Always parse the response, even if it's not OK
        const data = await response.json();
        
        // Special case for login page to prevent redirection loops
        if (data.fromLogin) {
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(!!data.user);
        }
      } catch (error) {
        // Silently handle errors on auth pages
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/auth/')) {
          setIsAuthenticated(false);
        } else {
          console.error('Error checking authentication:', error);
          setIsAuthenticated(false);
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { isAuthenticated, isLoading };
}

/**
 * Redirects to login page with the current URL as callback
 * @param callbackUrl Optional callback URL to redirect to after login
 * @param force If true, will redirect even if already on the login page
 */
export function redirectToLogin(callbackUrl?: string, force: boolean = false) {
  // Don't redirect if we're already on the login page unless forced
  if (!force && typeof window !== 'undefined' && window.location.pathname === '/auth/login') {
    return;
  }
  
  const url = callbackUrl || window.location.pathname;
  const encodedUrl = encodeURIComponent(url);
  
  // Use window.location for client-side navigation
  if (typeof window !== 'undefined') {
    window.location.href = `/auth/login?callbackUrl=${encodedUrl}`;
  }
}

/**
 * Handles authentication errors by redirecting to login
 * @param response The fetch response
 * @param callbackUrl Optional callback URL
 * @returns true if handled (redirected), false otherwise
 */
export function handleAuthError(response: Response, callbackUrl?: string): boolean {
  if (response.status === 401) {
    redirectToLogin(callbackUrl);
    return true;
  }
  return false;
} 