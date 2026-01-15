
import { db } from '@/lib/firebase';
import type { Transaction, AccountSummary } from '@/lib/types';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    doc, 
    updateDoc, 
    deleteDoc, 
    orderBy,
    limit,
    getDoc,
    setDoc,
    Timestamp,
    runTransaction,
    where
} from 'firebase/firestore';

// A generic business type to be used by services that share collections
type BusinessType = 'agriculture' | 'tour';

const getCollectionRefs = (businessType: BusinessType) => {
    const transactionsCollectionName = `${businessType}-transactions`;
    const accountSummaryDocName = `${businessType}-accountSummary`;
    return {
        transactionsCollectionRef: collection(db, transactionsCollectionName),
        accountSummaryDocRef: doc(db, accountSummaryDocName, 'latest'),
        transactionsCollectionName: transactionsCollectionName,
    };
};

/**
 * A specific listener for the main reports page that needs ALL transactions from the agriculture business.
 */
export const listenToAllTransactions = (callback: (items: Transaction[]) => void) => {
    const { transactionsCollectionRef } = getCollectionRefs('agriculture');
    const q = query(transactionsCollectionRef, where('date', '!=', null), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({ 
                id: doc.id, 
                ...data,
                date: data.date?.toDate?.() ?? new Date()
            } as Transaction);
        });
        callback(transactions);
    });
    return unsubscribe;
};


// Transaction Functions
export const listenToTransactions = (businessType: BusinessType, callback: (items: Transaction[]) => void) => {
    const { transactionsCollectionRef } = getCollectionRefs(businessType);
    const q = query(transactionsCollectionRef, where('date', '!=', null), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            transactions.push({ 
                id: doc.id, 
                ...data,
                date: data.date?.toDate?.() ?? new Date()
            } as Transaction);
        });
        callback(transactions);
    }, (error) => {
        console.error(`Error in snapshot listener for ${businessType}:`, error);
    });
    return unsubscribe;
};

export const addTransaction = async (businessType: BusinessType, transaction: Omit<Transaction, 'id'>) => {
    const { transactionsCollectionName } = getCollectionRefs(businessType);
    const transactionWithTimestamp = { 
        ...transaction, 
        businessType: businessType, // Ensure businessType is set
        date: Timestamp.fromDate(transaction.date) 
    };

    await addDoc(collection(db, transactionsCollectionName), transactionWithTimestamp);
};

export const updateTransaction = async (businessType: BusinessType, id: string, updatedFields: Partial<Omit<Transaction, 'id'>>) => {
    const { transactionsCollectionRef } = getCollectionRefs(businessType);
    const transactionDocRef = doc(transactionsCollectionRef, id);

    const updateDataForFirestore = updatedFields.date 
        ? { ...updatedFields, date: Timestamp.fromDate(updatedFields.date) }
        : updatedFields;

    await updateDoc(transactionDocRef, updateDataForFirestore);
};


export const deleteTransaction = async (businessType: BusinessType, id: string) => {
    const { transactionsCollectionRef } = getCollectionRefs(businessType);
    const transactionDocRef = doc(transactionsCollectionRef, id);
    await deleteDoc(transactionDocRef);
};

// Account Summary Functions
export const listenToAccountSummary = (businessType: 'agriculture', callback: (summary: AccountSummary | null) => void) => {
    const { accountSummaryDocRef } = getCollectionRefs(businessType);
    const unsubscribe = onSnapshot(accountSummaryDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            callback({ 
                id: docSnapshot.id, 
                cash: data.cash ?? 0,
                transfer: data.transfer ?? 0,
                capital: data.capital ?? 0,
                workingCapital: data.workingCapital ?? 0
            } as AccountSummary);
        } else {
            callback(null);
        }
    }, (error) => {
        console.error(`Error listening to account summary for ${businessType}:`, error);
        callback(null); // Send back null on error
    });
    return unsubscribe;
};

export const updateAccountSummary = async (businessType: 'agriculture', summary: Partial<Omit<AccountSummary, 'id'>>) => {
    const { accountSummaryDocRef } = getCollectionRefs(businessType);
    await setDoc(accountSummaryDocRef, summary, { merge: true });
};
