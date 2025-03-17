import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    // Check if this is a request from the login page with a callback URL
    const url = new URL(request.url);
    const referer = request.headers.get('referer') || '';
    const isFromLoginPage = referer.includes('/auth/login');
    const hasCallbackParam = referer.includes('callbackUrl=');
    
    // Add cache control headers to prevent caching
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    // If this is a request from the login page with a callback, return a special response
    // to prevent redirection loops
    if (isFromLoginPage && hasCallbackParam) {
      return NextResponse.json(
        { user: null, fromLogin: true }, 
        { headers }
      );
    }
    
    const session = await auth();
    
    // Always return 200 status, even when not authenticated
    // This prevents console errors in the browser
    if (!session || !session.user) {
      return NextResponse.json(
        { user: null }, 
        { 
          status: 200, // Changed from 401 to 200
          headers
        }
      );
    }
    
    return NextResponse.json(
      { 
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        } 
      },
      { headers }
    );
  } catch (error) {
    console.error('Session error:', error);
    return NextResponse.json(
      { error: 'Internal server error', user: null }, // Added user: null
      { 
        status: 200, // Changed from 500 to 200
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
} 