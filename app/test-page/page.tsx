'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Application Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            This is a test page to verify that the application is working correctly.
          </p>
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${isLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isLoaded ? 'Client-side code loaded successfully' : 'Loading...'}</span>
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={() => alert('Button clicked!')}>
        Test Interactivity
      </Button>
    </div>
  );
} 