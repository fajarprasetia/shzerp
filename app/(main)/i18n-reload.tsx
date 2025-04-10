'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/app/i18n';

export default function I18nReloadPage() {
  const { t, i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const [currentLanguage, setCurrentLanguage] = useState('');
  const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null);
  
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);
  
  const handleReload = () => {
    try {
      // Force reinitialization
      if (i18n.options && i18n.options.resources) {
        console.log('Resources before reload:', Object.keys(i18n.options.resources));
      }
      
      // Force reload of all translations for both languages
      i18n.reloadResources(['en', 'zh']);
      
      // Toggle language to force a reload
      const nextLang = currentLanguage === 'en' ? 'zh' : 'en';
      i18n.changeLanguage(nextLang)
        .then(() => i18n.changeLanguage(currentLanguage))
        .then(() => {
          // Test if translations are working now
          const testShipmentTitle = i18n.t('shipment.history.title');
          console.log('Test translation after reload:', testShipmentTitle);
          
          setStatus({
            success: true,
            message: `Translations reloaded. Test: ${testShipmentTitle}`
          });
        });
    } catch (error) {
      console.error('Error reloading translations:', error);
      setStatus({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };
  
  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
      .then(() => {
        setCurrentLanguage(lang);
        setStatus({
          success: true,
          message: `Language changed to ${lang}`
        });
      })
      .catch(error => {
        setStatus({
          success: false,
          message: `Error changing language: ${error instanceof Error ? error.message : String(error)}`
        });
      });
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">i18n Translation Reload Utility</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Translation Status</CardTitle>
          <CardDescription>
            Current information about the translation system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Current Language:</strong> {currentLanguage}
          </div>
          <div>
            <strong>Is i18n Initialized:</strong> {i18n.isInitialized ? 'Yes' : 'No'}
          </div>
          <div>
            <strong>Available Languages:</strong> {i18n.languages?.join(', ')}
          </div>
          <div>
            <strong>Test Translations:</strong>
            <ul className="list-disc list-inside ml-4 mt-2">
              <li>Dashboard: {i18n.t('dashboard.title')}</li>
              <li>Shipment Title: {i18n.t('sales.shipment.title')}</li>
              <li>Shipment History Title: {i18n.t('sales.shipment.history.title')}</li>
              <li>Orders to Ship: {i18n.t('sales.shipment.orders.title')}</li>
            </ul>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={() => switchLanguage('en')}>
              Switch to English
            </Button>
            <Button onClick={() => switchLanguage('zh')}>
              Switch to Chinese
            </Button>
            <Button onClick={handleReload} variant="destructive">
              Force Reload Translations
            </Button>
          </div>
          
          {status && (
            <Alert variant={status.success ? "default" : "destructive"}>
              <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
              <AlertDescription>{status.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 