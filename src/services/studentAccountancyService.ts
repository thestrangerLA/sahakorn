
import { db } from '@/lib/firebase';
import type { AccountSummary, Transaction } from '@/lib/types';
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
    where
} from 'firebase/firestore';

const summaryDocRef = doc(db, 'student-accountSummary', 'latest');
const transactionsCollectionRef = collection(db, 'student-transactions');

const initialSummaryState: Omit<AccountSummary, 'id'> = {
    capital: 0,
    cash: 0,
    transfer: 0,
};

const ensureInitialState = async () => {
    const docSnap = await getDoc(summaryDocRef);
    if (!docSnap.exists()) {
        await setDoc(summaryDocRef, initialSummaryState);
    }
};

export const listenToStudentAccountSummary = (callback: (summary: AccountSummary | null) => void) => {
    ensureInitialState();
    
    const unsubscribe = onSnapshot(summaryDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            callback({
                id: docSnapshot.id,
                capital: data.capital || 0,
                cash: data.cash || 0,
                transfer: data.transfer || 0,
            } as AccountSummary);
        } else {
            callback({ id: 'latest', ...initialSummaryState });
        }
    });
    return unsubscribe;
};

export const updateStudentAccountSummary = async (summary: Partial<Omit<AccountSummary, 'id'>>) => {
    await setDoc(summaryDocRef, summary, { merge: true });
};

export const listenToStudentTransactions = (
    callback: (items: Transaction[]) => void,
    onError?: (error: Error) => void
) => {
    const q = query(transactionsCollectionRef, where('date', '!=', null), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({ 
                id: doc.id, 
                ...data,
                date: data.date?.toDate?.() ?? new Date(),
                amount: data.amount || 0
            } as Transaction);
        });
        callback(transactions);
    },
    (error) => {
        console.error("Error in student account transaction listener:", error);
        if (onError) {
            onError(error);
        }
    });
    return unsubscribe;
};

export const addStudentTransaction = async (transaction: Omit<Transaction, 'id' | 'businessType'>) => {
    const newTransactionRef = doc(transactionsCollectionRef);
    await setDoc(newTransactionRef, { 
        ...transaction,
        businessType: 'student',
        date: Timestamp.fromDate(transaction.date),
        createdAt: serverTimestamp()
    });
};

export const updateStudentTransaction = async (id: string, updatedFields: Partial<Omit<Transaction, 'id'>>) => {
    const transactionDocRef = doc(transactionsCollectionRef, id);
    const dataToUpdate: any = { ...updatedFields };
    if (updatedFields.date) {
        dataToUpdate.date = Timestamp.fromDate(updatedFields.date);
    }
    await updateDoc(transactionDocRef, dataToUpdate);
};

export const deleteStudentTransaction = async (id: string) => {
    const transactionDocRef = doc(transactionsCollectionRef, id);
    await deleteDoc(transactionDocRef);
};
