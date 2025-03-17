'use server';

import { cookies } from 'next/headers';

/**
 * Checks if the user is authenticated by looking for auth cookies
 * This is a server-only function that can be used in server components
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = cookies();
  
  // Check for auth cookies
  const token = 
    cookieStore.get('next-auth.session-token')?.value || 
    cookieStore.get('__Secure-next-auth.session-token')?.value ||
    cookieStore.get('next-auth.session-token.local')?.value;
  
  return !!token;
}

/**
 * Gets the authentication token from cookies
 */
export function getAuthToken(): string | undefined {
  const cookieStore = cookies();
  
  return cookieStore.get('next-auth.session-token')?.value || 
         cookieStore.get('__Secure-next-auth.session-token')?.value ||
         cookieStore.get('next-auth.session-token.local')?.value;
} 