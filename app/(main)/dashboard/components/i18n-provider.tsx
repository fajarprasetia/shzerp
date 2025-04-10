"use client";

import { ReactNode, useEffect } from 'react';
import i18nInstance from '@/app/i18n';
import { I18nextProvider } from 'react-i18next';

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  useEffect(() => {
    // Ensure i18n is initialized
    if (!i18nInstance.isInitialized) {
      i18nInstance.init();
    }
  }, []);

  return (
    <I18nextProvider i18n={i18nInstance}>
      {children}
    </I18nextProvider>
  );
} 