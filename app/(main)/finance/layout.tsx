'use client';

import React, { useEffect } from 'react';
import { I18nLoader } from '@/components/i18n-loader';
import { useTranslation } from 'react-i18next';
import i18nInstance from '@/app/i18n';
import { useLanguage } from '@/app/providers';

// Hard-coded Chinese translations with explicit index signature
const FINANCE_ZH_TRANSLATIONS: { [key: string]: string } = {
  'finance.accountsReceivable.title': '应收账款',
  'finance.accountsReceivable.subtitle': '管理客户付款，跟踪账龄账户，并处理收款',
  'finance.accountsReceivable.paymentsReceived': '已收付款',
  'finance.accountsReceivable.agingReport': '账龄报告',
  'finance.accountsReceivable.collections': '收款管理',
  'finance.accountsReceivable.reconciliation': '对账',
  'finance.accountsReceivable.paymentTracking.title': '付款跟踪',
  'finance.accountsReceivable.paymentTracking.subtitle': '跟踪和管理客户付款',
  'finance.accountsReceivable.paymentTracking.invoiceNo': '发票号码',
  'finance.accountsReceivable.paymentTracking.customer': '客户',
  'finance.accountsReceivable.paymentTracking.amount': '金额',
  'finance.accountsReceivable.paymentTracking.paymentDate': '付款日期',
  'finance.accountsReceivable.paymentTracking.paymentMethod': '付款方式',
  'finance.accountsReceivable.paymentTracking.reference': '参考编号',
  'finance.accountsReceivable.paymentTracking.totalPayments': '付款总额',
  'finance.accountsReceivable.paymentTracking.noData': '没有可用的付款数据',
  'finance.accountsReceivable.paymentTracking.fetchError': '获取付款数据失败',
  'finance.accountsReceivable.paymentTracking.errorLoading': '加载付款数据时出错',
  'finance.accountsReceivable.paymentTracking.viewProof': '查看付款凭证',
  'finance.accountsReceivable.paymentTracking.closeModal': '关闭',
  'finance.accountsReceivable.paymentTracking.paymentProof': '付款凭证',
  // Aging report translations
  'finance.accountsReceivable.aging.title': '账龄报告',
  'finance.accountsReceivable.aging.subtitle': '按账龄查看逾期发票',
  'finance.accountsReceivable.aging.invoiceNo': '发票号码',
  'finance.accountsReceivable.aging.customer': '客户',
  'finance.accountsReceivable.aging.amount': '金额',
  'finance.accountsReceivable.aging.dueDate': '到期日',
  'finance.accountsReceivable.aging.daysOverdue': '逾期 {{days}} 天',
  'finance.accountsReceivable.aging.current': '当前',
  'finance.accountsReceivable.aging.days30': '1-30天',
  'finance.accountsReceivable.aging.days60': '31-60天',
  'finance.accountsReceivable.aging.days90': '61-90天',
  'finance.accountsReceivable.aging.over90': '90天以上',
  'finance.accountsReceivable.aging.total': '总计',
  'finance.accountsReceivable.aging.noData': '没有可用的账龄数据',
  'finance.accountsReceivable.aging.fetchError': '获取账龄报告失败',
  'finance.accountsReceivable.aging.errorLoading': '加载账龄报告时出错',
  'finance.accountsReceivable.aging.invoiceCount': '{{count}} 张发票',
  'finance.accountsReceivable.aging.bucket.030': '0-30 天',
  'finance.accountsReceivable.aging.bucket.3160': '31-60 天',
  'finance.accountsReceivable.aging.bucket.6190': '61-90 天',
  'finance.accountsReceivable.aging.bucket.90': '90+ 天',
  'finance.accountsReceivable.aging.bucket.Over': '超过 90 天',
  // Collections translations
  'finance.accountsReceivable.collection.title': '收款管理',
  'finance.accountsReceivable.collection.subtitle': '管理逾期发票和收款工作',
  'finance.accountsReceivable.collection.orderNo': '订单号',
  'finance.accountsReceivable.collection.customer': '客户',
  'finance.accountsReceivable.collection.amount': '金额',
  'finance.accountsReceivable.collection.dueDate': '到期日',
  'finance.accountsReceivable.collection.daysOverdue': '逾期天数',
  'finance.accountsReceivable.collection.days': '{{days}} 天',
  'finance.accountsReceivable.collection.status': '状态',
  'finance.accountsReceivable.collection.lastContact': '最后联系',
  'finance.accountsReceivable.collection.nextFollowup': '下次跟进',
  'finance.accountsReceivable.collection.errorLoading': '加载收款数据时出错',
  'finance.accountsReceivable.collection.noData': '没有可用的收款数据',
  'finance.accountsReceivable.collection.fetchError': '获取收款数据失败',
  'finance.accountsReceivable.collection.totalOverdue': '逾期总额',
  'finance.accountsReceivable.collection.ordersInCollection': '收款中的订单',
  'finance.accountsReceivable.collection.averageDaysOverdue': '平均逾期天数',
  'finance.accountsReceivable.collection.statuses.overdue': '逾期',
  'finance.accountsReceivable.collection.statuses.in_collection': '收款中',
  'finance.accountsReceivable.collection.statuses.legal': '法律程序',
  'finance.accountsReceivable.collection.statuses.written_off': '已注销',
  // AR Reconciliation translations
  'finance.accountsReceivable.reconciliationDetails.title': '应收账款对账',
  'finance.accountsReceivable.reconciliationDetails.subtitle': '核对应收账款余额',
  'finance.accountsReceivable.reconciliationDetails.invoiceNo': '发票号码',
  'finance.accountsReceivable.reconciliationDetails.customer': '客户',
  'finance.accountsReceivable.reconciliationDetails.invoiceAmount': '发票金额',
  'finance.accountsReceivable.reconciliationDetails.paymentsReceived': '已收款项',
  'finance.accountsReceivable.reconciliationDetails.balance': '余额',
  'finance.accountsReceivable.reconciliationDetails.dueDate': '到期日',
  'finance.accountsReceivable.reconciliationDetails.lastPaymentDate': '最后付款日期',
  'finance.accountsReceivable.reconciliationDetails.totalInvoiceAmount': '发票总额',
  'finance.accountsReceivable.reconciliationDetails.totalPaymentsReceived': '已收款项总额',
  'finance.accountsReceivable.reconciliationDetails.totalBalance': '余额总计',
  'finance.accountsReceivable.reconciliationDetails.errorLoading': '加载对账数据时出错',
  'finance.accountsReceivable.reconciliationDetails.noData': '没有可用的对账数据',
  // Accounts Payable section translations
  'finance.accountsPayable.title': '应付账款',
  'finance.accountsPayable.description': '管理供应商账单、付款和跟踪账龄账户',
  'finance.accountsPayable.vendorBills': '供应商账单',
  'finance.accountsPayable.paymentTracking': '付款跟踪',
  'finance.accountsPayable.agingReport': '账龄报告',
  // Vendor Bills translations
  'finance.vendorBill.title': '供应商账单',
  'finance.vendorBill.due': '截止日期',
  'finance.vendorBill.statuses.paid': '已付款',
  'finance.vendorBill.statuses.pending': '待处理',
  'finance.vendorBill.statuses.overdue': '逾期',
  'finance.vendorBill.statuses.draft': '草稿',
  'finance.vendorBill.markPaid': '标记为已付款',
  'finance.vendorBill.fetchError': '获取供应商账单失败。请重试。',
  'finance.vendorBill.statusUpdateSuccess': '账单状态已更新为 {{status}}',
  'finance.vendorBill.statusUpdateError': '更新账单状态失败。请重试。',
  'finance.vendorBill.empty.title': '未找到供应商账单',
  'finance.vendorBill.empty.description': '创建您的第一个供应商账单以开始使用。',
  'finance.vendorBill.createBill': '创建账单',
  // Vendor Bills columns translations
  'finance.vendorBill.columns.billNo': '账单编号',
  'finance.vendorBill.columns.vendor': '供应商',
  'finance.vendorBill.columns.amount': '金额',
  'finance.vendorBill.columns.billDate': '账单日期',
  'finance.vendorBill.columns.dueDate': '到期日',
  'finance.vendorBill.columns.status': '状态',
  // Vendor Bill actions
  'finance.vendorBill.actions.copyId': '复制账单 ID',
  'finance.vendorBill.actions.viewDetails': '查看详情',
  'finance.vendorBill.actions.updateStatus': '更新状态',
  'common.retry': '重试'
};

// Special loader for finance translations
function FinanceI18nLoader() {
  const { i18n } = useTranslation(undefined, { i18n: i18nInstance });
  const { language } = useLanguage();
  
  useEffect(() => {
    const currentLang = i18n.language || language || 'en';
    console.log(`Finance module: ensuring translations for ${currentLang}`);
    
    // Force finance module translations to be available
    try {
      if (currentLang === 'zh') {
        // Our direct injection approach - set these in window for global access
        if (typeof window !== 'undefined') {
          window.__financeTranslations = FINANCE_ZH_TRANSLATIONS;
          console.log('Finance translations set in window object for global access');
        }
        
        // Add finance translations for Chinese via standard i18n API 
        // (this may or may not work, but we have our fallback)
        i18n.addResources('zh', 'translation', {
          finance: {
            accountsReceivable: {
              title: '应收账款',
              subtitle: '管理客户付款，跟踪账龄账户，并处理收款',
              paymentsReceived: '已收付款',
              agingReport: '账龄报告',
              collections: '收款管理', 
              reconciliation: '对账',
              paymentTracking: {
                title: '付款跟踪',
                subtitle: '跟踪和管理客户付款',
                invoiceNo: '发票号码',
                customer: '客户',
                amount: '金额',
                paymentDate: '付款日期',
                paymentMethod: '付款方式',
                reference: '参考编号',
                totalPayments: '付款总额',
                noData: '没有可用的付款数据',
                fetchError: '获取付款数据失败',
                errorLoading: '加载付款数据时出错',
                viewProof: '查看付款凭证',
                closeModal: '关闭',
                paymentProof: '付款凭证'
              },
              aging: {
                title: '账龄报告',
                subtitle: '按账龄查看逾期发票',
                invoiceNo: '发票号码',
                customer: '客户',
                amount: '金额',
                dueDate: '到期日',
                daysOverdue: '逾期 {{days}} 天',
                current: '当前',
                days30: '1-30天',
                days60: '31-60天',
                days90: '61-90天',
                over90: '90天以上',
                total: '总计',
                noData: '没有可用的账龄数据',
                fetchError: '获取账龄报告失败',
                errorLoading: '加载账龄报告时出错',
                invoiceCount: '{{count}} 张发票',
                bucket: {
                  '030': '0-30 天',
                  '3160': '31-60 天',
                  '6190': '61-90 天',
                  '90': '90+ 天',
                  'Over': '超过 90 天'
                }
              },
              // Add collections translations
              collection: {
                title: '收款管理',
                subtitle: '管理逾期发票和收款工作',
                orderNo: '订单号',
                customer: '客户',
                amount: '金额',
                dueDate: '到期日',
                daysOverdue: '逾期天数',
                days: '{{days}} 天',
                status: '状态',
                lastContact: '最后联系',
                nextFollowup: '下次跟进',
                errorLoading: '加载收款数据时出错',
                noData: '没有可用的收款数据',
                fetchError: '获取收款数据失败',
                totalOverdue: '逾期总额',
                ordersInCollection: '收款中的订单',
                averageDaysOverdue: '平均逾期天数',
                statuses: {
                  overdue: '逾期',
                  in_collection: '收款中',
                  legal: '法律程序',
                  written_off: '已注销'
                }
              },
              // Add reconciliation translations
              reconciliationDetails: {
                title: '应收账款对账',
                subtitle: '核对应收账款余额',
                invoiceNo: '发票号码',
                customer: '客户',
                invoiceAmount: '发票金额',
                paymentsReceived: '已收款项',
                balance: '余额',
                dueDate: '到期日',
                lastPaymentDate: '最后付款日期',
                totalInvoiceAmount: '发票总额',
                totalPaymentsReceived: '已收款项总额',
                totalBalance: '余额总计',
                errorLoading: '加载对账数据时出错',
                noData: '没有可用的对账数据'
              }
            },
            // Add Accounts Payable translations
            accountsPayable: {
              title: '应付账款',
              description: '管理供应商账单、付款和跟踪账龄账户',
              vendorBills: '供应商账单',
              paymentTracking: '付款跟踪',
              agingReport: '账龄报告'
            },
            // Add Vendor Bills translations
            vendorBill: {
              title: '供应商账单',
              due: '截止日期',
              statuses: {
                paid: '已付款',
                pending: '待处理',
                overdue: '逾期',
                draft: '草稿'
              },
              markPaid: '标记为已付款',
              fetchError: '获取供应商账单失败。请重试。',
              statusUpdateSuccess: '账单状态已更新为 {{status}}',
              statusUpdateError: '更新账单状态失败。请重试。',
              empty: {
                title: '未找到供应商账单',
                description: '创建您的第一个供应商账单以开始使用。'
              },
              createBill: '创建账单',
              columns: {
                billNo: '账单编号',
                vendor: '供应商',
                amount: '金额',
                billDate: '账单日期',
                dueDate: '到期日',
                status: '状态'
              },
              actions: {
                copyId: '复制账单 ID',
                viewDetails: '查看详情',
                updateStatus: '更新状态'
              }
            }
          }
        });
        
        // Force direct resources loading using a different approach
        for (const [key, value] of Object.entries(FINANCE_ZH_TRANSLATIONS)) {
          const parts = key.split('.');
          let current: any = {};
          let currentTarget = current;
          
          // Build nested object structure
          for (let i = 0; i < parts.length - 1; i++) {
            currentTarget[parts[i]] = currentTarget[parts[i]] || {};
            currentTarget = currentTarget[parts[i]];
          }
          
          // Set final value
          currentTarget[parts[parts.length - 1]] = value;
          
          // Try adding it directly at each level to maximize chances of success
          try {
            i18n.addResourceBundle('zh', 'translation', current, true, true);
          } catch (e) {
            console.warn('Error adding resource bundle for', key, e);
          }
        }
        
        // Directly try using the main ones
        console.log('Direct ZH key check:');
        console.log('AR title:', i18n.t('finance.accountsReceivable.title', { lng: 'zh' }));
        console.log('PT title:', i18n.t('finance.accountsReceivable.paymentTracking.title', { lng: 'zh' }));
        console.log('Aging title:', i18n.t('finance.accountsReceivable.aging.title', { lng: 'zh' }));
        console.log('Collections title:', i18n.t('finance.accountsReceivable.collection.title', { lng: 'zh' }));
        console.log('Reconciliation title:', i18n.t('finance.accountsReceivable.reconciliationDetails.title', { lng: 'zh' }));
        console.log('AP title:', i18n.t('finance.accountsPayable.title', { lng: 'zh' }));
        console.log('Vendor Bills title:', i18n.t('finance.vendorBill.title', { lng: 'zh' }));
        console.log('Vendor Bill Status Paid:', i18n.t('finance.vendorBill.statuses.paid', { lng: 'zh' }));
      }
    } catch (error) {
      console.error('Finance module: Error loading translations:', error);
    }
  }, [i18n, i18n.language, language]);
  
  return null;
}

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <I18nLoader />
      <FinanceI18nLoader />
      {children}
    </>
  );
} 