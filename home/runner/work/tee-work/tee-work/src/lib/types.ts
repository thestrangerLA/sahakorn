
export type CurrencyValues = {
  kip: number;
  thb: number;
  usd: number;
  cny: number;
};

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'income'
  | 'expense'

export interface Account {
  id: string
  code: string
  name: string
  type: AccountType
  href?: string
}

export type UserAction =
  | 'MEMBER_DEPOSIT'
  | 'SET_MEMBER_DEPOSITS'
  | 'MEMBER_WITHDRAW'
  | 'PURCHASE_FIXED_ASSET'
  | 'SELL_CREDIT'
  | 'COLLECT_RECEIVABLE'
  | 'INVESTMENT_CASH'
  | 'RECEIVE_INVESTMENT_INCOME'
  | 'SELL_MURABAHA'
  | 'COLLECT_MURABAHA_RECEIVABLE'
  | 'PAY_GENERAL_EXPENSE'
  | 'SET_CASH_OPENING_BALANCE'
  | 'RECOGNIZE_MURABAHA_PROFIT';


export type ContractType = 'QARD' | 'MURABAHA' | 'SALE' | 'CAPITAL' | 'MUDARABAH_OR_MUSHARAKAH';

export interface Transaction {
  id: string;
  transactionGroupId?: string;
  date: Date;
  accountId?: string;
  type: 'debit' | 'credit';
  amount: CurrencyValues;
  description: string;
  reference?: string;
  loanId?: string;
  createdAt: Date;
  businessType?: 'cooperative';
  userAction?: UserAction;
  contractType?: ContractType;
  systemGenerated?: boolean;
  currentValue?: CurrencyValues;
}

export interface AccountSummary {
    id:string;
    cash: CurrencyValues;
    transfer: CurrencyValues;
    capital: CurrencyValues;
    bankAccount?: CurrencyValues;
}

export interface CooperativeMember {
  id: string;
  memberId: string;
  name: string;
  joinDate: Date;
  deposits: Omit<CurrencyValues, 'cny'>;
  createdAt: Date;
}

export interface CooperativeDeposit {
  id: string;
  memberId: string;
  memberName: string;
  date: Date;
  kip: number;
  thb: number;
  usd: number;
  cny: number;
  createdAt: Date;
  transactionGroupId?: string;
}

export interface CooperativeInvestment {
  id: string;
  date: Date;
  description: string;
  amount: CurrencyValues;
  createdAt: Date;
  transactionGroupId?: string;
}

export type IslamicLoanType = 'MURABAHA' | 'MUSHARAKAH' | 'MUDARABAH' | 'QARD_HASAN';

export interface Loan {
  id: string;
  memberId?: string;
  debtorName?: string;
  loanCode: string;
  amount: Omit<CurrencyValues, 'cny'>;
  repaymentAmount: Omit<CurrencyValues, 'cny'>;
  purpose: string;
  applicationDate: Date;
  durationYears: number;
  status: 'active' | 'closed' | 'settled';
  createdAt: Date;
  loanType?: IslamicLoanType;
  outstandingBalance?: Omit<CurrencyValues, 'cny'>;
  totalPrincipalPaid?: Omit<CurrencyValues, 'cny'>;
  totalProfitPaid?: Omit<CurrencyValues, 'cny'>;
  profitRecorded?: boolean;
}


export interface LoanRepayment {
  id: string;
  loanId: string;
  transactionGroupId?: string;
  repaymentDate: Date;
  amountPaid: Omit<CurrencyValues, 'cny'>;
  principalPortion?: Omit<CurrencyValues, 'cny'>;
  profitPortion?: Omit<CurrencyValues, 'cny'>;
  note: string;
  createdAt: Date;
}

export interface AccountingPeriod {
  id: string; // e.g., "2024-08"
  year: number;
  month: number;
  isClosed: boolean;
  closedAt?: Date;
}

export type DividendItem = { 
  id: string; 
  name: string; 
  percentage: number; 
};
