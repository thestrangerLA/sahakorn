
import { db } from '@/lib/firebase';
import type { AccountSummary, Transaction, CurrencyValues } from '@/lib/types';
import { 
    doc, 
    onSnapshot, 
    setDoc,
    getDoc,
    collection,
    query,
    orderBy,
    addDoc,
    Timestamp,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    writeBatch,
    where,
    getDocs,
} from 'firebase/firestore';

// This file is now deprecated and its contents have been moved to cooperativeAccountingService.ts
// It is kept for historical purposes to avoid breaking old imports, but new code should not use it.

const summaryDocRef = doc(db, 'cooperative-accountSummary', 'latest');
const transactionsCollectionRef = collection(db, 'cooperative-transactions');

const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };


const initialSummaryState: Omit<AccountSummary, 'id'> = {
    capital: { ...initialCurrencyValues },
    cash: { ...initialCurrencyValues },
    transfer: { ...initialCurrencyValues },
};
