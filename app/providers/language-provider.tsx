'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Import our pre-initialized i18n instance
import i18nInstance from '../i18n';

export type Language = 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false);
  const [languageState, setLanguageState] = useState<Language>('en');
  // Use the pre-initialized instance
  const { i18n } = useTranslation(undefined, { i18n: i18nInstance });

  // Safely set the language, with error handling and fallbacks
  const setLanguage = useCallback(async (newLanguage: Language) => {
    console.log(`LanguageProvider: Setting language to ${newLanguage}`);
    
    try {
      // First, update the language state
      setLanguageState(newLanguage);
      
      // Persist language choice in localStorage when possible
      if (typeof window !== 'undefined') {
        localStorage.setItem('language', newLanguage);
      }

      // Change language using the imported i18nInstance directly
      // This ensures all components using this instance get updated
      await i18nInstance.changeLanguage(newLanguage);
      console.log(`Language changed to ${newLanguage} successfully using i18nInstance`);
      
      // Force a reload of the page to ensure all components update properly
      // This is a guaranteed way to make sure all components pick up the new language
      window.location.reload();
    } catch (error) {
      console.error('Error changing language:', error);
    }
  }, []);

  // First mount effect - load language from localStorage
  useEffect(() => {
    if (!isMounted) {
      try {
        // Get language from localStorage with fallback
        let savedLanguage: Language = 'en';
        
        if (typeof window !== 'undefined') {
          const storedLanguage = localStorage.getItem('language');
          if (storedLanguage === 'en' || storedLanguage === 'zh') {
            savedLanguage = storedLanguage;
          }
        }
        
        console.log(`Initial language from localStorage: ${savedLanguage}`);
        
        // Set language in state
        setLanguageState(savedLanguage);
        
        // Direct synchronization with i18n on first load
        if (i18nInstance.language !== savedLanguage) {
          i18nInstance.changeLanguage(savedLanguage).then(() => {
            console.log(`Initial language set to ${savedLanguage}`);
          }).catch(err => {
            console.error('Error setting initial language:', err);
          });
        }
        
        setIsMounted(true);
      } catch (error) {
        console.error('Error getting initial language:', error);
        setLanguageState('en');
        setIsMounted(true);
      }
    }
  }, [isMounted]);

  return (
    <LanguageContext.Provider value={{ language: languageState, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}