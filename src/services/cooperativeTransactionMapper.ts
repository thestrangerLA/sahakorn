
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
  QARD_HASAN_GIVE: 'QARD',
  QARD_HASAN_RECEIVE: 'QARD',
  INVESTMENT_CASH: 'MUDARABAH_OR_MUSHARAKAH',
  RECEIVE_INVESTMENT_INCOME: 'MUDARABAH_OR_MUSHARAKAH',
  SELL_MURABAHA: 'MURABAHA',
  COLLECT_MURABAHA_RECEIVABLE: 'MURABAHA',
  PAY_GENERAL_EXPENSE: 'SALE',
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
      // Member deposits cash to the cooperative (like a savings account)
      // This is a Qard contract - members can withdraw anytime
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
      // Initialize opening balance for member deposits
      return {
        debitAccountId: 'opening_balance_equity',
        creditAccountId: 'deposits_liability',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: false,
          notes: 'Opening balance entry - requires board approval'
        }
      };

    case 'MEMBER_WITHDRAW':
      // Member withdraws from their deposit
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
    // MURABAHA (Cost-plus sale with deferred payment)
    // ═══════════════════════════════════════════════════════════
    
    case 'SELL_MURABAHA':
      // Sell goods with disclosed markup (profit)
      // At point of sale: Record receivable (cost + profit) and recognize cost
      // Profit is deferred until payment is received
      return {
        debitAccountId: 'murabaha_receivable',
        creditAccountId: 'inventory',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: true,
          notes: 'Murabaha - Must have written contract specifying cost, profit margin, and payment terms. No increase in payment based on delay (no riba).'
        },
        secondaryEntries: [
          {
            // Record the profit portion as deferred income
            debitAccountId: 'murabaha_receivable',
            creditAccountId: 'deferred_murabaha_income',
            amountField: 'profit'
          }
        ]
      };

    case 'COLLECT_MURABAHA_RECEIVABLE':
      // Collect payment from murabaha sale
      // When payment received: Reduce receivable, realize deferred income as profit
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
            // Realize the profit portion as income
            debitAccountId: 'deferred_murabaha_income',
            creditAccountId: 'sales_income', // Changed from murabaha_income
            amountField: 'profit'
          }
        ]
      };

    // ═══════════════════════════════════════════════════════════
    // QARD HASAN (Benevolent loan - gives to borrower, no benefit)
    // ═══════════════════════════════════════════════════════════
    
    case 'QARD_HASAN_GIVE':
      // Give interest-free loan to member
      // The cooperative receives ZERO profit from this
      return {
        debitAccountId: 'qard_hasan_receivable',
        creditAccountId: paymentChannel,
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: true,
          requiresContract: true,
          notes: 'Qard Hasan - Benevolent loan with NO profit, NO markup, NO interest. Borrower returns exact amount borrowed.'
        }
      };

    case 'QARD_HASAN_RECEIVE':
      // Receive repayment of qard hasan loan
      return {
        debitAccountId: paymentChannel,
        creditAccountId: 'qard_hasan_receivable',
        contractType,
        shariahCompliance: {
          isRibaFree: true,
          requiresApproval: false,
          requiresContract: false,
          notes: 'Qard Hasan repayment - Full amount received, no extra charges for delay'
        }
      };

    // ═══════════════════════════════════════════════════════════
    // NORMAL SALES (Cash or Credit)
    // ═══════════════════════════════════════════════════════════
    
    case 'SELL_CREDIT':
      // Sell goods on credit (not murabaha - just normal business sale)
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
      // Collect payment from credit sale
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
      // Invest cash in mudarabah or musharakah project
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
      // Receive profit/income from investment
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
    // GENERAL EXPENSES
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

    default:
      throw new Error(`Unsupported action: ${action}`);
  }
}

/**
 * Validates that an entry complies with Islamic principles
 */
export function validateShariahCompliance(entry: AutoEntry): {
  isCompliant: boolean;
  warnings: string[];
  requiresReview: boolean;
} {
  const warnings: string[] = [];
  let requiresReview = false;

  if (!entry.shariahCompliance.isRibaFree) {
    warnings.push('⚠️ This transaction is NOT riba-free. Review required.');
    requiresReview = true;
  }

  if (entry.shariahCompliance.requiresApproval) {
    warnings.push('✓ This entry requires board/manager approval');
    requiresReview = true;
  }

  if (entry.shariahCompliance.requiresContract) {
    warnings.push('✓ Ensure written contract exists and is attached');
  }

  return {
    isCompliant: entry.shariahCompliance.isRibaFree,
    warnings,
    requiresReview
  };
}

/**
 * Helper to generate audit description for Shariah compliance log
 */
export function generateShariahAuditNote(
  action: UserAction, 
  entry: AutoEntry, 
  description: string
): string {
  const timestamp = new Date().toISOString();
  return `
[${timestamp}] ${action}
Contract Type: ${entry.contractType}
Description: ${description}
Riba-Free: ${entry.shariahCompliance.isRibaFree ? '✓ Yes' : '✗ No'}
Approval Required: ${entry.shariahCompliance.requiresApproval ? 'Yes' : 'No'}
Contract Required: ${entry.shariahCompliance.requiresContract ? 'Yes' : 'No'}
Notes: ${entry.shariahCompliance.notes}
  `.trim();
}
