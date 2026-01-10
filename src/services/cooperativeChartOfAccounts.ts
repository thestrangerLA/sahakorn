

import type { Account } from '@/lib/types';

export const defaultAccounts: Account[] = [
  { id: 'cash', code: '101', name: 'ເງິນສົດ', type: 'asset' },
  { id: 'loan_receivable', code: '102', name: 'ລູກໜີ້ເງິນກູ້', type: 'asset' },
  { id: 'interest_income', code: '401', name: 'ລາຍຮັບດອກເບ້ຍ', type: 'income' },
  { id: 'expense_general', code: '501', name: 'ຄ່າໃຊ້ຈ່າຍທົ່ວໄປ', type: 'expense' },
];

// In a real application, you would have functions here to manage the Chart of Accounts in Firestore
// e.g., listenToAccounts, addAccount, updateAccount
