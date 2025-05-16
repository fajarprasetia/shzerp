"use client";

import { useInspectionLogs } from "@/hooks/use-inspection-logs";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

interface InventoryLogsTableProps {
  itemType: "stock" | "divided";
}

export function InventoryLogsTable({ itemType }: InventoryLogsTableProps) {
  const { t } = useTranslation();
  // @ts-ignore: Hook does accept options but TypeScript has issues with it
  const { logs, isLoading, error, mutate } = useInspectionLogs({ itemType, limit: 50 });
  const isError = !!error;

  if (isLoading) return <div>{t('common.loading', 'Loading...')}</div>;
  if (isError) return <div>{t('common.error', 'Error loading logs')}</div>;
  if (!logs.length) return <div>{t('inventory.logs.noLogs', 'No logs found.')}</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border">
        <thead>
          <tr className="bg-muted">
            <th className="px-2 py-1 border">{t('inventory.logs.action', 'Action')}</th>
            <th className="px-2 py-1 border">{t('inventory.logs.item', 'Item')}</th>
            <th className="px-2 py-1 border">{t('inventory.logs.user', 'User')}</th>
            <th className="px-2 py-1 border">{t('inventory.logs.time', 'Time')}</th>
            <th className="px-2 py-1 border">{t('inventory.logs.note', 'Note')}</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: any) => (
            <tr key={log.id}>
              <td className="px-2 py-1 border">{log.type.replace(/_/g, ' ')}</td>
              <td className="px-2 py-1 border">{log.itemIdentifier}</td>
              <td className="px-2 py-1 border">{log.userName || '-'}</td>
              <td className="px-2 py-1 border">{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}</td>
              <td className="px-2 py-1 border">{log.note || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 