/**
 * Formats a number as currency with the specified currency code
 * @param value The number to format
 * @param currencyCode The currency code (default: 'IDR')
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencyCode: string = 'IDR'): string {
  // Default to IDR if no currency code is provided
  const currency = currencyCode || 'IDR';
  
  // Format options for different currencies
  const formatOptions: Record<string, Intl.NumberFormatOptions> = {
    IDR: { 
      style: 'currency', 
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    },
    USD: { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    },
    RMB: { 
      style: 'currency', 
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }
  };
  
  // Use the appropriate format options or default to IDR
  const options = formatOptions[currency] || formatOptions.IDR;
  
  try {
    return new Intl.NumberFormat('id-ID', options).format(value);
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    if (currency === 'IDR') {
      return `Rp ${value.toLocaleString('id-ID')}`;
    } else if (currency === 'USD') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'RMB') {
      return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `${value}`;
  }
} 