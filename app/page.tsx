'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useIsAuthenticated } from '@/app/lib/client-auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useIsAuthenticated();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        window.location.replace('/dashboard');
      } else {
        window.location.replace('/auth/login');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold mb-6">Welcome to SHZ ERP System</h1>
      <p className="text-xl mb-8 max-w-2xl">
        A comprehensive enterprise resource planning solution for business operations.
      </p>
      <div className="flex gap-4">
        <Button size="lg" onClick={() => window.location.replace('/auth/login')}>
          Login
        </Button>
        <Button size="lg" variant="outline" onClick={() => window.open('https://github.com/yourusername/erp', '_blank')}>
          Learn More
        </Button>
      </div>
    </div>
  );
} 