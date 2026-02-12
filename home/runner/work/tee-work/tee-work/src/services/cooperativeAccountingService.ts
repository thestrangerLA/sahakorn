
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, Timestamp, writeBatch, where, getDocs, deleteDoc, getDoc, setDoc, doc, updateDoc, type Transaction as FirestoreTransaction } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase'
import type { Transaction, CurrencyValues, Account, AccountSummary, UserAction, ContractType } from '@/lib/types'
import { mapActionToEntry } from './cooperativeTransactionMapper';

const transactionsCollectionRef = collection(db, 'cooperative-transactions');
const summaryDocRef = doc(db, 'cooperative-accountSummary', 'latest');

const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const initialSummaryState: Omit<AccountSummary, 'id' | 'workingCapital' > = {
    capital: { ...initialCurrencyValues },
    cash: { ...initialCurrencyValues },
    transfer: { ...initialCurrencyValues },
    bankAccount: { ...initialCurrencyValues },
};

const ensureInitialState = async () => {
    const docSnap = await getDoc(summaryDocRef);
    if (!docSnap.exists()) {
        await setDoc(summaryDocRef, initialSummaryState);
    }
};

export const listenToCooperativeAccountSummary = (callback: (summary: AccountSummary | null) => void) => {
    ensureInitialState();
    
    const unsubscribe = onSnapshot(summaryDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            callback({
                id: docSnapshot.id,
                capital: data.capital || { ...initialCurrencyValues },
                cash: data.cash || { ...initialCurrencyValues },
                transfer: data.transfer || { ...initialCurrencyValues },
                bankAccount: data.bankAccount || { ...initialCurrencyValues },
            } as AccountSummary);
        } else {
            callback({ id: 'latest', ...initialSummaryState });
        }
    });
    return unsubscribe;
};

export const updateCooperativeAccountSummary = async (summary: Partial<Omit<AccountSummary, 'id'>>) => {
    await setDoc(summaryDocRef, summary, { merge: true });
};

export async function createJournalTransaction(
  { debitAccountId, creditAccountId, amount, description, date, userAction, contractType, systemGenerated = false, loanId }:
  { debitAccountId: string, creditAccountId: string, amount: CurrencyValues, description: string, date: Date, userAction?: UserAction, contractType?: ContractType, systemGenerated?: boolean, loanId?: string },
  transaction: FirestoreTransaction | WriteBatch
): Promise<string> {
  const transactionGroupId = uuidv4();
  const transactionDate = Timestamp.fromDate(date);

  const debitData: Omit<Transaction, 'id'> & { createdAt: any } = {
    transactionGroupId,
    date: transactionDate,
    accountId: debitAccountId,
    type: 'debit',
    amount,
    description,
    createdAt: serverTimestamp(),
    businessType: 'cooperative',
    userAction,
    contractType,
    systemGenerated,
    loanId,
    currentValue: { ...initialCurrencyValues },
  };

  const creditData: Omit<Transaction, 'id'> & { createdAt: any } = {
    transactionGroupId,
    date: transactionDate,
    accountId: creditAccountId,
    type: 'credit',
    amount,
    description,
    createdAt: serverTimestamp(),
    businessType: 'cooperative',
    userAction,
    contractType,
    systemGenerated,
    loanId,
    currentValue: { ...initialCurrencyValues },
  };
  
  if (!loanId) {
      delete debitData.loanId;
      delete creditData.loanId;
  }
  
  const debitRef = doc(transactionsCollectionRef);
  const creditRef = doc(transactionsCollectionRef);

  if (transaction) {
    if ('set' in transaction) { // It's a WriteBatch
      transaction.set(debitRef, debitData);
      transaction.set(creditRef, creditData);
    } else { // It's a Transaction
      transaction.set(debitRef, debitData);
      transaction.set(creditRef, creditData);
    }
  } else {
    const batch = writeBatch(db);
    batch.set(debitRef, debitData);
    batch.set(creditRef, creditData);
    await batch.commit();
  }

  return transactionGroupId;
}

export async function recordUserAction({ action, amount, profit, description, date, loanId, paymentChannel = 'cash' }: {action: UserAction, amount: CurrencyValues, profit?: CurrencyValues, description: string, date: Date, loanId?: string, paymentChannel?: 'cash' | 'bank_bcel'}, transaction?: FirestoreTransaction | WriteBatch): Promise<string> {
    const { debitAccountId, creditAccountId, contractType, secondaryEntries } = mapActionToEntry(action, paymentChannel);
    
    // The amount for the primary journal entry is always the `amount` parameter.
    const primaryAmount = amount;
    
    // Primary entry
    const mainTransactionGroupId = await createJournalTransaction({
        debitAccountId,
        creditAccountId,
        amount: primaryAmount,
        description,
        date,
        userAction: action,
        contractType: contractType,
        systemGenerated: true,
        loanId,
    }, transaction);
    
    // Handle secondary entries (like for Murabaha profit deferral)
    if (secondaryEntries && profit) {
        for (const entry of secondaryEntries) {
            let secondaryAmount = { ...initialCurrencyValues };
            if (entry.amountField === 'profit' && profit) {
                secondaryAmount = { ...profit };
            }
            
            if (Object.values(secondaryAmount).some(v => v > 0)) {
                await createJournalTransaction({
                    debitAccountId: entry.debitAccountId,
                    creditAccountId: entry.creditAccountId,
                    amount: secondaryAmount,
                    description: `(Auto) Defer Profit for ${description}`,
                    date,
                    userAction: action,
                    contractType: contractType,
                    systemGenerated: true,
                    loanId
                }, transaction);
            }
        }
    }
    return mainTransactionGroupId;
}


export async function deleteTransactionGroup(transactionGroupId: string) {
  if (!transactionGroupId) {
    throw new Error("Transaction Group ID is required to delete an entry.");
  }

  const q = query(transactionsCollectionRef, where("transactionGroupId", "==", transactionGroupId));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.warn(`No transactions found with group ID: ${transactionGroupId}`);
    return;
  }

  const batch = writeBatch(db);
  querySnapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
}


export function sumCurrency(a: CurrencyValues, b: CurrencyValues): CurrencyValues {
  return {
    kip: (a.kip || 0) + (b.kip || 0),
    thb: (a.thb || 0) + (b.thb || 0),
    usd: (a.usd || 0) + (b.usd || 0),
    cny: (a.cny || 0) + (b.cny || 0),
  }
}

export const listenToCooperativeTransactions = (
    callback: (items: Transaction[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(transactionsCollectionRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({ 
                id: doc.id, 
                ...data,
                date: (data.date as Timestamp)?.toDate(),
                amount: data.amount || { ...initialCurrencyValues },
                currentValue: data.currentValue || { ...initialCurrencyValues },
            } as Transaction);
        });
        callback(transactions);
    },
    (error) => {
        console.error("Error in cooperative account transaction listener:", error);
        if (onError) {
            onError(error);
        }
    });
    return unsubscribe;
};

export async function updateCooperativeTransaction(id: string, updatedFields: Partial<Omit<Transaction, 'id'>>) {
    const transactionDocRef = doc(transactionsCollectionRef, id);
    await updateDoc(transactionDocRef, updatedFields);
};

export function getAccountBalances(transactions: Transaction[]): Record<string, CurrencyValues> {
    const balances: Record<string, CurrencyValues> = {};
    const currencyKeys: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];

    transactions.forEach(tx => {
        if (!tx.accountId) return;
        if (!balances[tx.accountId]) {
            balances[tx.accountId] = { kip: 0, thb: 0, usd: 0, cny: 0 };
        }

        const multiplier = tx.type === 'debit' ? 1 : -1;
        
        currencyKeys.forEach(currencyKey => {
            const amount = tx.amount as CurrencyValues;
            if (amount && amount[currencyKey]) {
                balances[tx.accountId][currencyKey] += (amount[currencyKey] || 0) * multiplier;
            }
        });
    });

    return balances;
}
