'use client';

import { I18nLoader } from '@/components/i18n-loader';

export default function ShipmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <I18nLoader />
      {children}
    </>
  );
} 