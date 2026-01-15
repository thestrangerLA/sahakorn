

export type StockItem = {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  costPrice: number; // Cost in Kip
  costPriceBaht: number; // Cost in Baht
  wholesalePrice: number;
  sellingPrice: number;
};

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
  | 'PURCHASE_INVENTORY'
  | 'SET_INVENTORY_OPENING_BALANCE'
  | 'SELL_CREDIT'
  | 'COLLECT_RECEIVABLE'
  | 'INVESTMENT_CASH'
  | 'RECEIVE_INVESTMENT_INCOME'
  | 'SELL_MURABAHA'
  | 'COLLECT_MURABAHA_RECEIVABLE'
  | 'PAY_GENERAL_EXPENSE'
  | 'ZERO_OUT_OPENING_BALANCE';


export type ContractType = 'QARD' | 'MURABAHA' | 'SALE' | 'CAPITAL' | 'MUDARABAH_OR_MUSHARAKAH';

export interface Transaction {
  id: string;
  transactionGroupId: string;
  date: Date;
  accountId: string;
  type: 'debit' | 'credit';
  amount: CurrencyValues;
  description: string;
  reference?: string;
  loanId?: string;
  createdAt: Date;
  businessType?: 'agriculture' | 'tour' | 'documents' | 'meat-business' | 'appliances' | 'autoparts' | 'cooperative';
  saleId?: string;
  profit?: number;
  userAction?: UserAction;
  contractType?: ContractType;
  systemGenerated?: boolean;
  [key: string]: any; // Allow for currency fields like 'kip', 'baht', etc.
}


export interface AccountSummary {
    id:string;
    cash: any;
    transfer: any;
    capital: any;
    workingCapital?: number;
    bankAccount?: any;
}

export interface TransportEntry {
    id: string;
    type: 'ANS' | 'HAL' | 'MX' | 'NH';
    date: Date;
    order?: number;
    detail: string;
    cost: number;
    amount: number;
    quantity: number;
    finished: boolean;
    createdAt: Date; 
    sender?: 'Tee' | 'YU';
}

export interface CodEntry {
    id: string;
    company: 'ANS' | 'HAL' | 'MX' | 'NH';
    type: 'pending' | 'collected' | 'returned';
    date: Date;
    customerName: string;
    description: string;
    amount: number;
    isPaidToOffice: boolean;
    createdAt: Date;
}


export interface CashCalculatorState {
    id: string;
    counts: Record<string, number>;
}

export interface DebtorCreditorEntry {
  id: string;
  type: 'debtor' | 'creditor';
  date: Date;
  amount: number;
  description: string;
  isPaid: boolean;
  createdAt: Date;
}

export interface DrugCreditorEntry {
  id: string;
  date: Date;
  order: number;
  description: string;
  note?: string;
  cost: number;
  sellingPrice: number;
  isPaid: boolean;
  createdAt: Date;
}

export interface TourProgram {
  id: string;
  date: Date;
  tourDates: string;
  tourCode: string;
  programName: string;
  groupName: string;
  pax: number;
  destination: string;
  durationDays: number;
  price: number;
  priceCurrency: 'LAK' | 'THB' | 'USD' | 'CNY';
  bankCharge: number;
  bankChargeCurrency: 'LAK' | 'THB' | 'USD' | 'CNY';
  totalPrice: number;
  createdAt: Date;
}

export type Currency = 'LAK' | 'THB' | 'USD' | 'CNY';

export interface TourCostItem {
  id: string;
  programId: string;
  date: Date | null;
  detail: string;
  lak: number;
  thb: number;
  usd: number;
  cny: number;
  createdAt: Date;
}

export interface TourIncomeItem {
  id: string;
  programId: string;
  date: Date | null;
  detail: string;
  lak: number;
  thb: number;
  usd: number;
  cny: number;
  createdAt: Date;
}

export interface MeatStockItem {
  id: string;
  sku: string;
  name: string; 
  packageSize: number; 
  costPrice: number; 
  sellingPrice: number; 
  currentStock: number; 
  createdAt: Date;
  isFinished?: boolean;
}

export interface MeatStockLog {
  id: string;
  itemId: string;
  change: number;
  newStock: number;
  type: 'stock-in' | 'sale';
  detail: string;
  createdAt: Date;
}

export interface ApplianceStockItem {
  id: string;
  sku: string;
  name: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  createdAt: Date;
}

export interface Sale {
    id: string;
    items: { id: string; name: string; quantity: number; price: number; total: number; costPrice: number; }[];
    subtotal: number;
    totalCost?: number;
    totalProfit?: number;
    date: Date;
    createdAt: Date;
}

export interface ApplianceStockLog {
  id: string;
  itemId: string;
  change: number;
  newStock: number;
  type: 'stock-in' | 'sale';
  detail: string;
  createdAt: Date;
}

export interface TourAccountSummary {
    id: string;
    capital: CurrencyValues;
    cash: CurrencyValues;
    transfer: CurrencyValues;
}

export interface DocumentAccountSummary {
    id: string;
    capital: CurrencyValues;
    cash: CurrencyValues;
    transfer: CurrencyValues;
    bankAccount?: CurrencyValues;
}

export interface ApplianceCustomer {
    id: string;
    name: string;
    address: string;
    phone: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  phone: string;
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

export type IslamicLoanType = 'MURABAHA' | 'MUSHARAKAH' | 'MUDARABAH';

export interface Loan {
  id: string;
  memberId?: string;
  debtorName?: string;
  loanCode: string;
  amount: Omit<CurrencyValues, 'cny'>;
  repaymentAmount: Omit<CurrencyValues, 'cny'>;
  purpose: string;
  applicationDate: Date;
  durationMonths: number;
  status: 'active' | 'closed';
  createdAt: Date;
  loanType?: IslamicLoanType;
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
