'use client';

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

interface TrialBalanceData {
  accounts: Account[];
  totalDebit: number;
  totalCredit: number;
  asOfDate: string;
}

export async function generateTrialBalanceExcel(data: TrialBalanceData): Promise<Uint8Array> {
  // This is a placeholder function that would normally generate an Excel file
  // For now, we'll just return an empty buffer to fix the build error
  return new Uint8Array();
} 