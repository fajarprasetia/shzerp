import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-sky-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full blur-3xl animate-blob bg-gradient-to-br from-blue-200/40 to-indigo-300/40 dark:from-blue-500/10 dark:to-violet-500/10" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full blur-3xl animate-blob animation-delay-2000 bg-gradient-to-br from-sky-200/40 to-violet-300/40 dark:from-violet-500/10 dark:to-sky-500/10" />
        <div className="absolute top-[20%] right-[20%] w-[50%] h-[50%] rounded-full blur-3xl animate-blob animation-delay-4000 bg-gradient-to-br from-indigo-200/40 to-blue-300/40 dark:from-sky-500/10 dark:to-blue-500/10" />
      </div>
      <div className="relative min-h-screen backdrop-blur-[2px] flex items-center justify-center">
        <div className="w-full max-w-7xl mx-auto">
          {children}
          <Toaster />
        </div>
      </div>
    </div>
  );
} 