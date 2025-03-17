'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskStats } from '../tasks/components/task-stats';
import { TaskFilters } from '../tasks/components/task-filters';
import { TaskBoard } from '../tasks/components/task-board';

// Sample task data for testing
const sampleTasks = [
  {
    id: '1',
    title: 'Complete project proposal',
    description: 'Finish the project proposal document and send it to the client',
    status: 'todo',
    priority: 'high',
    category: 'work',
    tags: ['urgent', 'client'],
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Review code changes',
    description: 'Review pull request #123 and provide feedback',
    status: 'in-progress',
    priority: 'medium',
    category: 'work',
    tags: ['review', 'development'],
    dueDate: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Update documentation',
    description: 'Update the API documentation with the latest changes',
    status: 'review',
    priority: 'low',
    category: 'work',
    tags: ['documentation'],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Deploy to production',
    description: 'Deploy the latest changes to the production environment',
    status: 'done',
    priority: 'high',
    category: 'work',
    tags: ['deployment', 'production'],
    dueDate: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
];

export default function TestTasksPage() {
  const [tasks, setTasks] = React.useState(sampleTasks);
  const [filteredTasks, setFilteredTasks] = React.useState(sampleTasks);

  const handleSearch = (query: string) => {
    if (!query) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredTasks(filtered);
  };

  const handleFilterStatus = (statuses: string[]) => {
    if (statuses.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => statuses.includes(task.status));
    setFilteredTasks(filtered);
  };

  const handleFilterPriority = (priorities: string[]) => {
    if (priorities.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => priorities.includes(task.priority));
    setFilteredTasks(filtered);
  };

  const handleFilterCategory = (categories: string[]) => {
    if (categories.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => categories.includes(task.category));
    setFilteredTasks(filtered);
  };

  const handleFilterTags = (tags: string[]) => {
    if (tags.length === 0) {
      setFilteredTasks(tasks);
      return;
    }
    
    const filtered = tasks.filter((task) => 
      task.tags?.some((tag) => tags.includes(tag))
    );
    setFilteredTasks(filtered);
  };

  const handleReset = () => {
    setFilteredTasks(tasks);
  };

  const handleTaskUpdate = async (taskId: string, updates: any) => {
    const updatedTasks = tasks.map((task) => 
      task.id === taskId ? { ...task, ...updates } : task
    );
    setTasks(updatedTasks);
    setFilteredTasks(updatedTasks);
    return Promise.resolve();
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Test Tasks Page</h1>
      <p className="mb-6 text-muted-foreground">
        This page tests the task components without requiring authentication.
      </p>
      
      <div className="grid gap-6 md:grid-cols-[300px,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskStats tasks={filteredTasks} />
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Task Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskFilters 
                onSearch={handleSearch}
                onFilterStatus={handleFilterStatus}
                onFilterPriority={handleFilterPriority}
                onFilterCategory={handleFilterCategory}
                onFilterTags={handleFilterTags}
                onReset={handleReset}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Task Board</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskBoard 
                tasks={filteredTasks} 
                selectedDate={new Date()} 
                onTaskUpdate={handleTaskUpdate}
                onTaskSelect={(task) => console.log('Selected task:', task)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 