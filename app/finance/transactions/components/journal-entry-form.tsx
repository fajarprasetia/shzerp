'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface JournalEntryItem {
  id: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string | null;
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

interface JournalEntry {
  id: string;
  entryNo: string;
  date: Date;
  description: string;
  reference?: string | null;
  status: string;
  totalDebit: number;
  totalCredit: number;
  createdAt: Date;
  items: JournalEntryItem[];
}

interface JournalEntryFormProps {
  entry?: JournalEntry | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalEntryForm({ entry, onSuccess, onCancel }: JournalEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // This is a placeholder for the actual form submission
    setTimeout(() => {
      setIsSubmitting(false);
      onSuccess();
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        This is a placeholder for the journal entry form.
      </p>
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
} 