'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from './providers';
import { useTranslation } from 'react-i18next';
// Import our pre-initialized i18n instance
import i18nInstance from './i18n';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const { i18n, t } = useTranslation(undefined, { i18n: i18nInstance });
  const [initialized, setInitialized] = useState(false);

  // Effect to ensure i18n language matches the language from context
  useEffect(() => {
    const syncLanguage = async () => {
      console.log(`I18nProvider: Syncing language to ${language}`);
      if (i18n.language !== language) {
        try {
          await i18n.changeLanguage(language);
          console.log(`I18nProvider: Language changed to ${language} successfully`);
          
          // Test if translation works
          const test = t('common.loading');
          console.log('Translation test:', test);
        } catch (error) {
          console.error('Failed to change i18n language:', error);
        }
      }
    };
    
    syncLanguage();
  }, [language, i18n, t]);

  // Additional initialization logging
  useEffect(() => {
    if (!initialized) {
      // Log current state
      console.log('I18nProvider: Current state', {
        language: language,
        i18nLanguage: i18n?.language,
        isInitialized: i18n?.isInitialized,
      });
      
      // Test a translation
      if (i18n?.isInitialized && typeof t === 'function') {
        try {
          const translation = t('dashboard.title', 'Dashboard Fallback');
          console.log('Translation test in I18nProvider:', translation);
        } catch (error) {
          console.error('Translation test failed:', error);
        }
      }
      
      setInitialized(true);
    }
  }, [initialized, i18n, t, language]);

  return <>{children}</>;
} 