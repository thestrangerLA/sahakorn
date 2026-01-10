
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

const ensureInitialState = async () => {
    const docSnap = await getDoc(summaryDocRef);
    if (!docSnap.exists()) {
        await setDoc(summaryDocRef, initialSummaryState);
    }
};

export const listenToCooperativeAccountSummary_DEPRECATED = (callback: (summary: AccountSummary | null) => void) => {
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

export const updateCooperativeAccountSummary_DEPRECATED = async (summary: Partial<Omit<AccountSummary, 'id'>>) => {
    await setDoc(summaryDocRef, summary, { merge: true });
};
