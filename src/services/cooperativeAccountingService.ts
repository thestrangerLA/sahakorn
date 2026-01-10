

import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Transaction, Currency, Account } from '@/lib/types'

const transactionsCollectionRef = collection(db, 'cooperative-transactions');

export async function createTransaction(
  debitAccountId: string,
  creditAccountId: string,
  amount: Currency,
  description: string,
  date: Date,
) {
  await addDoc(transactionsCollectionRef, {
    date: Timestamp.fromDate(date),
    accountId: debitAccountId,
    type: 'debit',
    amount,
    description,
    createdAt: serverTimestamp(),
    businessType: 'cooperative',
  })

  await addDoc(transactionsCollectionRef, {
    date: Timestamp.fromDate(date),
    accountId: creditAccountId,
    type: 'credit',
    amount,
    description,
    createdAt: serverTimestamp(),
    businessType: 'cooperative',
  })
}

export function sumCurrency(a: Currency, b: Currency): Currency {
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

export function getAccountBalances(transactions: Transaction[]): Record<string, Currency> {
    const balances: Record<string, Currency> = {};

    transactions.forEach(tx => {
        if (!balances[tx.accountId]) {
            balances[tx.accountId] = { kip: 0, thb: 0, usd: 0, cny: 0 };
        }

        const multiplier = tx.type === 'debit' ? 1 : -1;
        
        const currencyKeys: (keyof Currency)[] = ['kip', 'thb', 'usd', 'cny'];
        currencyKeys.forEach(currencyKey => {
            if (tx.amount && tx.amount[currencyKey]) {
                balances[tx.accountId][currencyKey] += (tx.amount[currencyKey] || 0) * multiplier;
            }
        });
    });

    return balances;
}
