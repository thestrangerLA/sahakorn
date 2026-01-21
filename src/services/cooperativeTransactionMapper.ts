
import type { UserAction, ContractType, CurrencyValues } from '@/lib/types';

type AutoEntry = {
  debitAccountId: string;
  creditAccountId: string;
  contractType: ContractType;
  shariahCompliance: {
    isRibaFree: boolean;
    requiresApproval: boolean;
    requiresContract: boolean;
    notes: string;
  };
  secondaryEntries?: { 
    debitAccountId: string; 
    creditAccountId: string; 
    amountField: 'profit' | 'principal' 
  }[];
};

const actionContractMap: Record<UserAction, ContractType> = {
  MEMBER_DEPOSIT: 'QARD',
  SET_MEMBER_DEPOSITS: 'CAPITAL',
  MEMBER_WITHDRAW: 'QARD',
  SELL_CREDIT: 'SALE',
  COLLECT_RECEIVABLE: 'SALE',
  INVESTMENT_CASH: 'MUDARABAH_OR_MUSHARAKAH',
  RECEIVE_INVESTMENT_INCOME: 'MUDARABAH_OR_MUSHARAKAH',
  SELL_MURABAHA: 'MURABAHA',
  COLLECT_MURABAHA_RECEIVABLE: 'MURABAHA',
  PAY_GENERAL_EXPENSE: 'SALE',
  SET_CASH_OPENING_BALANCE: 'CAPITAL',
  PURCHASE_FIXED_ASSET: 'SALE',
  RECOGNIZE_MURABAHA_PROFIT: 'MURABAHA',
};

/**
 * Maps user actions to automatic journal entries with Shariah compliance checks
 * This ensures all transactions follow Islamic accounting principles
 */
export function mapActionToEntry(action: UserAction, paymentChannel: 'cash' | 'bank_bcel' = 'cash'): AutoEntry {
  const contractType = actionContractMap[action];
  if (!contractType) {
    throw new Error(`Unsupported action or missing contract type for: ${action}`);
  }

  switch (action) {
    // ═══════════════════════════════════════════════════════════
    // MEMBER DEPOSITS & WITHDRAWALS (Qard - Interest-free loans)
    // ═══════════════════════════════════════════════════════════
    
    case 'MEMBER_DEPOSIT':
      return {
        debitAccountId: paymentChannel,
        creditAccountId: 'deposits_liability',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Qard Hasan - Member can withdraw full amount anytime. No interest (riba) involved.'
        }
      };
    
    case 'SET_MEMBER_DEPOSITS':
      // This action seems to be for setting opening balance for deposits, which should go against opening balance equity
      return {
        debitAccountId: 'cash', // Or appropriate asset account
        creditAccountId: 'deposits_liability',
        contractType: 'CAPITAL',
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: false,
          notes: 'Initial setting of member deposit liabilities.'
        }
      };

    case 'MEMBER_WITHDRAW':
      return {
        debitAccountId: 'deposits_liability',
        creditAccountId: paymentChannel,
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Withdrawal of Qard - member gets back their original amount'
        }
      };
      
    // ═══════════════════════════════════════════════════════════
    // ASSETS & MURABAHA (Cost-plus sale with deferred payment)
    // ═══════════════════════════════════════════════════════════
    case 'PURCHASE_FIXED_ASSET':
      return {
        debitAccountId: 'fixed_assets',
        creditAccountId: paymentChannel,
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Purchase of a long-term asset for operational use.'
        }
      };

    case 'SELL_MURABAHA':
      return {
        debitAccountId: 'murabaha_receivable',
        creditAccountId: 'cash', 
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: true,
          notes: 'Murabaha - Must have written contract specifying cost, profit margin, and payment terms. No increase in payment based on delay (no riba).'
        },
        secondaryEntries: [
          {
            debitAccountId: 'murabaha_receivable',
            creditAccountId: 'deferred_murabaha_income',
            amountField: 'profit'
          }
        ]
      };

    case 'COLLECT_MURABAHA_RECEIVABLE':
      return {
        debitAccountId: paymentChannel,
        creditAccountId: 'murabaha_receivable',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Collection of Murabaha payment. Late payments do NOT incur additional charges.'
        },
        secondaryEntries: [
            {
              debitAccountId: 'deferred_murabaha_income',
              creditAccountId: 'sales_income',
              amountField: 'profit'
            }
        ]
      };

    case 'RECOGNIZE_MURABAHA_PROFIT':
      return {
        debitAccountId: 'deferred_murabaha_income',
        creditAccountId: 'sales_income',
        contractType: 'MURABAHA',
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Recognizing deferred profit as income upon loan settlement.'
        }
      };

    // ═══════════════════════════════════════════════════════════
    // NORMAL SALES (Cash or Credit)
    // ═══════════════════════════════════════════════════════════
    
    case 'SELL_CREDIT':
      return {
        debitAccountId: 'accounts_receivable',
        creditAccountId: 'sales_income',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: true,
          notes: 'Credit sale - Customer owes the agreed price. Payment terms should be clear.'
        }
      };

    case 'COLLECT_RECEIVABLE':
      return {
        debitAccountId: paymentChannel,
        creditAccountId: 'accounts_receivable',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Collection of receivable - No additional payment charged for delay'
        }
      };

    // ═══════════════════════════════════════════════════════════
    // INVESTMENT & PARTNERSHIP (Mudarabah / Musharakah)
    // ═══════════════════════════════════════════════════════════
    
    case 'INVESTMENT_CASH':
      return {
        debitAccountId: 'investments',
        creditAccountId: paymentChannel,
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: true,
          notes: 'Investment via Mudarabah or Musharakah. Profit shared per contract. If loss, follow loss-sharing agreement.'
        }
      };
    
    case 'RECEIVE_INVESTMENT_INCOME':
      return {
        debitAccountId: paymentChannel,
        creditAccountId: 'investment_income',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Investment income received. Only from actual profit share, not guaranteed return.'
        }
      };
      
    // ═══════════════════════════════════════════════════════════
    // GENERAL EXPENSES & EQUITY ADJUSTMENTS
    // ═══════════════════════════════════════════════════════════
    
    case 'PAY_GENERAL_EXPENSE':
      return {
        debitAccountId: 'expense_general',
        creditAccountId: paymentChannel,
        contractType: 'SALE', // Expenses are part of general operational 'sales' cycle
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'General operational expense.'
        }
      };

    case 'SET_CASH_OPENING_BALANCE':
      return {
        debitAccountId: 'cash',
        creditAccountId: 'opening_balance_equity',
        contractType: 'CAPITAL',
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: false,
          notes: 'Setting the opening cash balance.'
        }
      };

    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}
