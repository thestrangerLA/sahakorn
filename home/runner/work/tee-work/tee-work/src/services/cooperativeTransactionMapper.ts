
import type { UserAction, ContractType } from '@/lib/types';

type AutoEntry = {
  debitAccountId: string;
  creditAccountId: string;
  contractType: ContractType;
  secondaryEntries?: { debitAccountId: string; creditAccountId: string; amountField: 'profit' | 'principal' }[];
};

const actionContractMap: Record<UserAction, ContractType> = {
  RECEIVE_CASH: 'SALE',
  PAY_CASH: 'SALE',
  MEMBER_DEPOSIT: 'QARD',
  MEMBER_WITHDRAW: 'QARD',
  SELL_CASH: 'SALE',
  SELL_CREDIT: 'SALE',
  COLLECT_RECEIVABLE: 'SALE',
  BUY_CASH: 'SALE',
  BUY_CREDIT: 'SALE',
  QARD_HASAN_GIVE: 'QARD',
  QARD_HASAN_RECEIVE: 'QARD',
  INVESTMENT_CASH: 'MUDARABAH_OR_MUSHARAKAH',
  RECEIVE_INVESTMENT_INCOME: 'MUDARABAH_OR_MUSHARAKAH',
  SELL_MURABAHA: 'MURABAHA',
  COLLECT_MURABAHA_RECEIVABLE: 'MURABAHA',
  SET_MEMBER_DEPOSITS: 'CAPITAL',
};

export function mapActionToEntry(action: UserAction): AutoEntry {
  const contractType = actionContractMap[action];
  if (!contractType) {
    throw new Error(`Unsupported action or missing contract type for: ${action}`);
  }

  switch (action) {
    case 'RECEIVE_CASH':
      return {
        debitAccountId: 'cash',
        creditAccountId: 'income_general',
        contractType,
      };

    case 'PAY_CASH':
      return {
        debitAccountId: 'expense_general',
        creditAccountId: 'cash',
        contractType,
      };

    case 'MEMBER_DEPOSIT':
      return {
        debitAccountId: 'cash',
        creditAccountId: 'deposits_liability',
        contractType,
      };
    
    case 'SET_MEMBER_DEPOSITS':
      return {
        debitAccountId: 'share_capital', // Or another equity account like 'Opening Balance Equity'
        creditAccountId: 'deposits_liability',
        contractType,
      };

    case 'MEMBER_WITHDRAW':
        return {
          debitAccountId: 'deposits_liability',
          creditAccountId: 'cash',
          contractType,
        };

    case 'SELL_CREDIT':
      return {
        debitAccountId: 'accounts_receivable',
        creditAccountId: 'sales_income',
        contractType,
      };

    case 'COLLECT_RECEIVABLE':
      return {
        debitAccountId: 'cash',
        creditAccountId: 'accounts_receivable',
        contractType,
      };
      
    case 'QARD_HASAN_GIVE':
      return {
        debitAccountId: 'qard_receivable',
        creditAccountId: 'cash',
        contractType,
      };

    case 'QARD_HASAN_RECEIVE':
        return {
            debitAccountId: 'cash',
            creditAccountId: 'qard_receivable',
            contractType
        };

    case 'INVESTMENT_CASH':
        return {
            debitAccountId: 'investments',
            creditAccountId: 'cash',
            contractType
        };
    
    case 'RECEIVE_INVESTMENT_INCOME':
        return {
            debitAccountId: 'cash',
            creditAccountId: 'investment_income',
            contractType
        };
    
    case 'SELL_MURABAHA':
        return {
            debitAccountId: 'murabaha_receivable', // Total repayment amount
            creditAccountId: 'cash', // Principal amount
            secondaryEntries: [
                {
                    debitAccountId: 'murabaha_receivable', // This seems counter-intuitive but it's part of the compound entry
                    creditAccountId: 'deferred_murabaha_income',
                    amountField: 'profit'
                }
            ],
            contractType
        };

    case 'COLLECT_MURABAHA_RECEIVABLE':
        return {
            debitAccountId: 'cash',
            creditAccountId: 'murabaha_receivable',
            secondaryEntries: [
                 {
                    debitAccountId: 'deferred_murabaha_income',
                    creditAccountId: 'sales_income', // Realize income
                    amountField: 'profit' // We need to calculate how much profit is in this payment
                }
            ],
            contractType
        };
        
    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}
