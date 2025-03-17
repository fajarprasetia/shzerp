import { NextRequest, NextResponse } from 'next/server';

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/error',
  '/test-page',
  '/test-tasks',
  '/api/auth/session',
  '/api/auth/permissions',
];

// Check if a path is a public route
const isPublicRoute = (path: string) => {
  return publicRoutes.some(route => 
    path === route || 
    path.startsWith('/auth/') ||
    path.startsWith('/api/auth/') ||
    path.startsWith('/_next/') ||
    path.includes('.') // Static files
  );
};

// Get auth token from cookies
const getAuthToken = (request: NextRequest): string | undefined => {
  return request.cookies.get('next-auth.session-token')?.value || 
         request.cookies.get('__Secure-next-auth.session-token')?.value;
};

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Log the path for debugging
  console.log('Middleware processing path:', path);
  
  // Allow public routes
  if (isPublicRoute(path)) {
    return NextResponse.next();
  }
  
  // Check for auth token
  const token = getAuthToken(request);
  
  if (token) {
    console.log('Auth token found for path:', path);
    return NextResponse.next();
  }
  
  // Redirect to login if no token
  const url = new URL('/auth/login', request.url);
  url.searchParams.set('callbackUrl', encodeURI(request.url));
  
  return NextResponse.redirect(url);
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 