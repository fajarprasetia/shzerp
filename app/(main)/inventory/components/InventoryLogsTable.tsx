"use client";

import { useInspectionLogs } from "@/hooks/use-inspection-logs";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/app/i18n";

interface InventoryLogsTableProps {
  itemType: "stock" | "divided";
}

export function InventoryLogsTable({ itemType }: InventoryLogsTableProps) {
  const { t } = useTranslation(undefined, { i18n: i18nInstance });
  const { data: logs, isLoading, isError } = useInspectionLogs({ itemType, limit: 50 });

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
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="px-2 py-1 border">{log.type.replace(/_/g, ' ')}</td>
              <td className="px-2 py-1 border">{log.itemIdentifier}</td>
              <td className="px-2 py-1 border">{log.userName || '-'}</td>
              <td className="px-2 py-1 border">{format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 