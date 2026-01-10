

import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, Timestamp, writeBatch, where, getDocs, deleteDoc, getDoc, setDoc, doc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/firebase'
import type { Transaction, CurrencyValues, Account, AccountSummary } from '@/lib/types'

const transactionsCollectionRef = collection(db, 'cooperative-transactions');
const summaryDocRef = doc(db, 'cooperative-accountSummary', 'latest');

const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };
const initialSummaryState: Omit<AccountSummary, 'id'> = {
    capital: { ...initialCurrencyValues },
    cash: { ...initialCurrencyValues },
    transfer: { ...initialCurrencyValues },
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


export async function createTransaction(
  debitAccountId: string,
  creditAccountId: string,
  amount: CurrencyValues,
  description: string,
  date: Date,
) {
  const transactionGroupId = uuidv4();

  await addDoc(transactionsCollectionRef, {
    transactionGroupId,
    date: Timestamp.fromDate(date),
    accountId: debitAccountId,
    type: 'debit',
    amount,
    description,
    createdAt: serverTimestamp(),
    businessType: 'cooperative',
  })

  await addDoc(transactionsCollectionRef, {
    transactionGroupId,
    date: Timestamp.fromDate(date),
    accountId: creditAccountId,
    type: 'credit',
    amount,
    description,
    createdAt: serverTimestamp(),
    businessType: 'cooperative',
  })
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
                amount: data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
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

export function getAccountBalances(transactions: Transaction[]): Record<string, CurrencyValues> {
    const balances: Record<string, CurrencyValues> = {};
    const currencyKeys: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];

    transactions.forEach(tx => {
        if (!balances[tx.accountId]) {
            balances[tx.accountId] = { kip: 0, thb: 0, usd: 0, cny: 0 };
        }

        const multiplier = tx.type === 'debit' ? 1 : -1;
        
        currencyKeys.forEach(currencyKey => {
            if (tx.amount && tx.amount[currencyKey]) {
                balances[tx.accountId][currencyKey] += (tx.amount[currencyKey] || 0) * multiplier;
            }
        });
    });

    return balances;
}

// Call the deletion for the two items. Note: This is a one-off operation.
const deleteSpecifiedItems = async () => {
    try {
        const q1 = query(transactionsCollectionRef, where("description", "==", "h"));
        const snapshot1 = await getDocs(q1);
        if (!snapshot1.empty) {
            const doc1 = snapshot1.docs[0];
            if (doc1.data().transactionGroupId) {
                await deleteTransactionGroup(doc1.data().transactionGroupId);
                console.log("Deleted transaction group for 'h'");
            }
        }

        const q2 = query(transactionsCollectionRef, where("description", "==", "d"));
        const snapshot2 = await getDocs(q2);
        if (!snapshot2.empty) {
            const doc2 = snapshot2.docs[0];
            if (doc2.data().transactionGroupId) {
                await deleteTransactionGroup(doc2.data().transactionGroupId);
                console.log("Deleted transaction group for 'd'");
            }
        }
    } catch (e) {
        console.error("Error deleting specified items: ", e);
    }
};

deleteSpecifiedItems();
