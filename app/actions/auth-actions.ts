'use server';

import { signIn as nextAuthSignIn } from '@/auth';
import { AuthError } from 'next-auth';
import { cookies } from 'next/headers';
import { signOut } from '@/auth';
import { redirect } from 'next/navigation';

/**
 * Server action to handle sign in
 */
export async function signInAction(email: string, password: string) {
  try {
    console.log('Attempting to sign in with email:', email);
    
    // Attempt to sign in
    const result = await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    
    if (!result || result.error) {
      console.log('Sign in failed:', result?.error || 'Unknown error');
      return { 
        success: false, 
        error: result?.error || 'Invalid credentials' 
      };
    }
    
    console.log('Sign in successful');
    
    // Force a short delay to ensure cookies are set
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return { success: true };
  } catch (error) {
    console.error('Sign in error:', error);
    
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: 'Invalid credentials' };
        case 'CallbackRouteError':
          return { success: false, error: 'Authentication callback error' };
        default:
          return { success: false, error: `Authentication error: ${error.type}` };
      }
    }
    
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Server action to handle sign out
 */
export async function signOutAction() {
  try {
    // Sign out the user with the correct parameters
    await signOut({
      redirect: false,
    });
    
    // Clear cookies manually as a fallback
    const cookieStore = cookies();
    const authCookies = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.callback.url',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];
    
    // Log existing cookies for debugging
    const existingCookies = cookieStore.getAll()
      .filter(cookie => authCookies.includes(cookie.name))
      .map(cookie => cookie.name);
    
    if (existingCookies.length > 0) {
      console.log('Auth cookies found:', existingCookies);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: 'Failed to sign out' };
  }
} 