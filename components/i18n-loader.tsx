'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/app/i18n';

/**
 * A component that ensures i18n translations are properly loaded
 * Place this in your layout or on pages where translations are needed
 */
export function I18nLoader() {
  const { i18n } = useTranslation(undefined, { i18n: i18nInstance });
  
  useEffect(() => {
    // Force reload translations when the component mounts
    const language = i18n.language || 'en';
    
    // Explicitly access resources directly to avoid backend warnings
    // since we're using a static resource object, not a backend
    try {
      if (i18n.options && i18n.options.resources) {
        // Log that we're using static resources
        console.log('I18nLoader: Using static resources instead of backend');
        
        // Force resources to be applied
        i18n.addResourceBundle(language, 'translation', i18n.options.resources[language].translation, true, true);
        
        // Attempt to extract and directly inject nested shipment keys to top-level as fallback
        // This helps when components use 'shipment.' instead of 'sales.shipment.'
        const salesShipment = i18n.options.resources[language]?.translation?.sales?.shipment;
        if (salesShipment) {
          console.log('I18nLoader: Adding fallback structure for direct shipment namespace');
          i18n.addResources(language, 'translation', { shipment: salesShipment });
        }
      } else {
        // Only reload if necessary - this will be skipped if no backend configured
        i18n.reloadResources(language);
      }
      
      console.log(`I18nLoader: Ensured translations for ${language} are loaded`);
      
      // Log some key translations to verify they're working
      console.log('Translation check - Dashboard:', i18n.t('dashboard.title'));
      console.log('Translation check - Shipment:', i18n.t('sales.shipment.title'));
      console.log('Translation check - History:', i18n.t('sales.shipment.history.title'));
      
      // Additional debug checks for problematic keys
      console.log('Translation check - Orders Title:', i18n.t('sales.shipment.orders.title'));
      console.log('Translation check - Orders Address:', i18n.t('sales.shipment.orders.address'));
      console.log('Translation check - Orders Items:', i18n.t('sales.shipment.orders.items'));
      
      // Check fallback structure 
      console.log('Fallback check - Orders Title:', i18n.t('shipment.orders.title'));
      console.log('Fallback check - Orders Address:', i18n.t('shipment.orders.address'));
      console.log('Fallback check - Orders Items:', i18n.t('shipment.orders.items'));
    } catch (error) {
      console.error('Translation check failed:', error);
    }
  }, [i18n]);
  
  // This component doesn't render anything
  return null;
}

/**
 * Wraps children with the I18nLoader to ensure translations are loaded
 */
export function withI18nLoader<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  return function WrappedWithI18n(props: P) {
    return (
      <>
        <I18nLoader />
        <Component {...props} />
      </>
    );
  };
}

export default I18nLoader; 