'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Test Page</h1>
      
      <div className="p-6 border rounded-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Application Status</h2>
        <p className="mb-4">
          This is a test page to verify that the application is working correctly.
        </p>
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isLoaded ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{isLoaded ? 'Client-side code loaded successfully' : 'Loading...'}</span>
        </div>
      </div>
      
      <button 
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        onClick={() => alert('Button clicked!')}
      >
        Test Interactivity
      </button>
    </div>
  );
} 