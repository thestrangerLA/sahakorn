
import type { Account } from '@/lib/types';

export const defaultAccounts: Account[] = [
  // Assets
  { id: 'cash', code: '1010', name: 'ເງິນສົດ (Cash)', type: 'asset' },
  { id: 'bank_bcel', code: '1021', name: 'ບັນຊີ BCEL', type: 'asset' },
  { id: 'accounts_receivable', code: '1200', name: 'ລູກໜີ້ການຄ້າ (A/R)', type: 'asset' },
  { id: 'murabaha_receivable', code: '1220', name: 'ລູກໜີ້ການຄ້າກຳໄລ (Murabaha)', type: 'asset' },
  { id: 'investments', code: '1300', name: 'ສິນຊັບລົງທຶນ (Investments)', type: 'asset' },
  { id: 'inventory', code: '1400', name: 'ສິນຄ້າຄົງເຫຼືອ (Inventory)', type: 'asset' },
  
  // Liabilities
  { id: 'accounts_payable', code: '2010', name: 'ເຈົ້າໜີ້ການຄ້າ (A/P)', type: 'liability' },
  { id: 'deposits_liability', code: '2100', name: 'ເງິນຝາກສະມາຊິກ (Member Deposits)', type: 'liability' },
  { id: 'deferred_murabaha_income', code: '2200', name: 'ລາຍຮັບຈາກການຂາຍກຳໄລຮອບັນທຶກ (Deferred Murabaha Income)', type: 'liability' },


  // Equity
  { id: 'share_capital', code: '3010', name: 'ທຶນຮຸ້ນ (Share Capital)', type: 'equity', href: '/tee/cooperative/members' },
  { id: 'opening_balance_equity', code: '3015', name: 'ທຶນຍົກມາ (Opening Balance Equity)', type: 'equity' },
  { id: 'retained_earnings', code: '3020', name: 'ກຳໄລສະສົມ (Retained Earnings)', type: 'equity' },

  // Income
  { id: 'sales_income', code: '4010', name: 'ລາຍຮັບຈາກການຂາຍ (Sales)', type: 'income' },
  { id: 'service_income', code: '4020', name: 'ລາຍຮັບຄ່າບໍລິການ (Service)', type: 'income' },
  { id: 'investment_income', code: '4030', name: 'ລາຍຮັບຈາກການລົງທຶນ (Investment)', type: 'income' },
  { id: 'income_general', code: '4900', name: 'ລາຍຮັບທົ່ວໄປ (General Income)', type: 'income' },


  // Expenses
  { id: 'cost_of_goods', code: '5010', name: 'ຕົ້ນທຶນຂາຍ (COGS)', type: 'expense' },
  { id: 'salary_expense', code: '5110', name: 'ຄ່າເງິນເດືອນ (Salaries)', type: 'expense' },
  { id: 'rent_expense', code: '5120', name: 'ຄ່າເຊົ່າ (Rent)', type: 'expense' },
  { id: 'utilities_expense', code: '5130', name: 'ຄ່ານ້ຳຄ່າໄຟ (Utilities)', type: 'expense' },
  { id: 'expense_general', code: '5900', name: 'ຄ່າໃຊ້ຈ່າຍທົ່ວໄປ (General Expense)', type: 'expense' },
];
