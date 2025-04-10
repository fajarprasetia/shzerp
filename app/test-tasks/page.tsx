'use client';

import { useState } from 'react';

export default function TestTasksPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Test Tasks Page</h1>
      
      <div className="p-6 border rounded-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Task Management</h2>
        <p className="mb-4">
          This is a simplified test page for task management.
        </p>
        
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full p-2 border rounded-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['To Do', 'In Progress', 'Done'].map((status) => (
            <div key={status} className="border rounded-md p-4">
              <h3 className="font-medium mb-2">{status}</h3>
              <div className="space-y-2">
                <div className="p-3 bg-white border rounded-md shadow-sm">
                  <div className="font-medium">Example Task</div>
                  <div className="text-sm text-gray-500">This is a placeholder task</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 