"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JournalEntryForm } from "./journal-entry-form";
import { useToast } from "@/components/ui/use-toast";
import { JournalEntry, JournalEntryStatus } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";
import { useLanguage } from "@/app/providers";

// Hard-coded Chinese translations
const ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.journalEntries.title': '会计分录',
  'finance.journalEntries.addEntry': '添加分录',
  'finance.journalEntries.editEntry': '编辑会计分录',
  'finance.journalEntries.createEntry': '创建新会计分录',
  'finance.journalEntries.entryNo': '分录编号',
  'finance.journalEntries.date': '日期',
  'finance.journalEntries.description': '描述',
  'finance.journalEntries.status': '状态',
  'finance.journalEntries.actions': '操作',
  'finance.journalEntries.edit': '编辑',
  'finance.journalEntries.post': '过账',
  'finance.journalEntries.errorSave': '保存会计分录失败。请重试。',
  'finance.journalEntries.errorPost': '过账会计分录失败。请重试。',
  'finance.journalEntries.successSave': '会计分录 {{entryNo}} 已{{action}}。',
  'finance.journalEntries.successPost': '会计分录 {{entryNo}} 已过账。',
  'finance.journalEntries.created': '创建',
  'finance.journalEntries.updated': '更新',
  'common.success': '成功',
  'common.error': '错误',
  'common.loading': '加载中...'
};

// Global translation function that completely bypasses i18n for Chinese
const forcedTranslate = (key: string, defaultValue: string, language: string, params?: Record<string, any>): string => {
  // For Chinese, use our hardcoded map
  if (language === 'zh' && key in ZH_TRANSLATIONS) {
    let translation = ZH_TRANSLATIONS[key];
    
    // Handle parameter substitution
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, String(value));
      });
    }
    
    console.log(`Forced journal entries translation for ${key}: ${translation}`);
    return translation;
  }
  
  // Check if we have translations in the window object
  if (language === 'zh' && typeof window !== 'undefined' && window.__financeTranslations && window.__financeTranslations[key]) {
    let translation = window.__financeTranslations[key];
    
    // Handle parameter substitution
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, String(value));
      });
    }
    
    return translation;
  }
  
  // Fallback to default value
  return defaultValue;
};

interface JournalEntriesProps {}

export function JournalEntries({}: JournalEntriesProps) {
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  // Helper function for translations with fallback
  const safeT = (key: string, defaultValue: string, params?: Record<string, any>): string => {
    return forcedTranslate(key, defaultValue, language, params);
  };
  
  // Add translations when component mounts
  useEffect(() => {
    if (mounted && language === 'zh') {
      console.log('Ensuring Chinese translations for Journal Entries Component');
      
      try {
        // Directly add the resources to i18n
        i18nInstance.addResources('zh', 'translation', {
          finance: {
            journalEntries: {
              title: '会计分录',
              addEntry: '添加分录',
              editEntry: '编辑会计分录',
              createEntry: '创建新会计分录',
              entryNo: '分录编号',
              date: '日期',
              description: '描述',
              status: '状态',
              actions: '操作',
              edit: '编辑',
              post: '过账',
              errorSave: '保存会计分录失败。请重试。',
              errorPost: '过账会计分录失败。请重试。',
              successSave: '会计分录 {{entryNo}} 已{{action}}。',
              successPost: '会计分录 {{entryNo}} 已过账。',
              created: '创建',
              updated: '更新'
            }
          },
          common: {
            success: '成功',
            error: '错误',
            loading: '加载中...'
          }
        });
        console.log('Added journal entries translations for zh');
      } catch (e) {
        console.error('Error adding journal entries translations:', e);
      }
    }
    setMounted(true);
  }, [mounted, language, i18nInstance]);

  const columns: ColumnDef<JournalEntry>[] = [
    {
      accessorKey: "entryNo",
      header: safeT('finance.journalEntries.entryNo', 'Entry No'),
    },
    {
      accessorKey: "date",
      header: safeT('finance.journalEntries.date', 'Date'),
      cell: ({ row }) => format(new Date(row.getValue("date")), "dd/MM/yyyy"),
    },
    {
      accessorKey: "description",
      header: safeT('finance.journalEntries.description', 'Description'),
    },
    {
      accessorKey: "status",
      header: safeT('finance.journalEntries.status', 'Status'),
      cell: ({ row }) => {
        const status = row.getValue("status") as JournalEntryStatus;
        return status.replace(/_/g, " ");
      },
    },
    {
      id: "actions",
      header: safeT('finance.journalEntries.actions', 'Actions'),
      cell: ({ row }) => {
        const entry = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedEntry(entry);
                setShowForm(true);
              }}
              disabled={entry.status !== "DRAFT"}
            >
              {safeT('finance.journalEntries.edit', 'Edit')}
            </Button>
            {entry.status === "DRAFT" && (
              <Button
                variant="default"
                size="sm"
                onClick={() => handlePost(entry.id)}
              >
                {safeT('finance.journalEntries.post', 'Post')}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const handleSubmit = async (entryData: Partial<JournalEntry>) => {
    try {
      const response = await fetch(
        selectedEntry
          ? `/api/finance/journal-entries/${selectedEntry.id}`
          : "/api/finance/journal-entries",
        {
          method: selectedEntry ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(entryData),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save journal entry");
      }

      const savedEntry = await response.json();

      setEntries((prev) =>
        selectedEntry
          ? prev.map((entry) =>
              entry.id === savedEntry.id ? savedEntry : entry
            )
          : [...prev, savedEntry]
      );

      toast({
        title: safeT('common.success', 'Success'),
        description: safeT(
          'finance.journalEntries.successSave', 
          `Journal entry ${savedEntry.entryNo} has been ${selectedEntry ? "updated" : "created"}.`,
          {
            entryNo: savedEntry.entryNo,
            action: safeT(
              selectedEntry ? 'finance.journalEntries.updated' : 'finance.journalEntries.created',
              selectedEntry ? 'updated' : 'created'
            )
          }
        ),
      });

      setShowForm(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Error saving journal entry:", error);
      toast({
        title: safeT('common.error', 'Error'),
        description: safeT('finance.journalEntries.errorSave', 'Failed to save journal entry. Please try again.'),
        variant: "destructive",
      });
    }
  };

  const handlePost = async (id: string) => {
    try {
      const response = await fetch(`/api/finance/journal-entries/${id}/post`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to post journal entry");
      }

      const updatedEntry = await response.json();

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === updatedEntry.id ? updatedEntry : entry
        )
      );

      toast({
        title: safeT('common.success', 'Success'),
        description: safeT('finance.journalEntries.successPost', 'Journal entry {{entryNo}} has been posted.', { entryNo: updatedEntry.entryNo }),
      });
    } catch (error) {
      console.error("Error posting journal entry:", error);
      toast({
        title: safeT('common.error', 'Error'),
        description: safeT('finance.journalEntries.errorPost', 'Failed to post journal entry. Please try again.'),
        variant: "destructive",
      });
    }
  };

  // Return a loading placeholder while mounting to avoid hydration issues
  if (!mounted) {
    return <div className="p-4">{safeT('common.loading', 'Loading...')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{safeT('finance.journalEntries.title', 'Journal Entries')}</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {safeT('finance.journalEntries.addEntry', 'Add Entry')}
        </Button>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedEntry 
                ? safeT('finance.journalEntries.editEntry', 'Edit Journal Entry')
                : safeT('finance.journalEntries.createEntry', 'Create New Journal Entry')
              }
            </DialogTitle>
          </DialogHeader>
          <JournalEntryForm
            initialData={selectedEntry}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setSelectedEntry(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={entries}
          searchKey="entryNo"
        />
      </div>
    </div>
  );
} 