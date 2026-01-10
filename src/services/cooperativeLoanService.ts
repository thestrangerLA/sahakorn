

import { db } from '@/lib/firebase';
import type { Loan, LoanRepayment, LoanType, CurrencyValues, CooperativeMember } from '@/lib/types';
import { 
    collection, 
    onSnapshot, 
    query, 
    doc, 
    orderBy,
    where,
    Timestamp,
    addDoc,
    serverTimestamp,
    getDoc,
    runTransaction,
    increment,
    updateDoc,
    deleteDoc,
    getDocs,
    writeBatch,
    limit
} from 'firebase/firestore';

const loansCollectionRef = collection(db, 'cooperativeLoans');
const loanTypesCollectionRef = collection(db, 'cooperativeLoanTypes');
const repaymentsCollectionRef = collection(db, 'cooperativeLoanRepayments');
const currencies: (keyof Loan['amount'])[] = ['kip', 'thb', 'usd'];
const initialCurrencyValues: CurrencyValues = { kip: 0, baht: 0, usd: 0, cny: 0 };


export const listenToCooperativeLoans = (
    callback: (loans: Loan[]) => void, 
    onComplete: () => void
) => {
    const q = query(loansCollectionRef, orderBy('applicationDate', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loans: Loan[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            loans.push({ 
                id: doc.id, 
                ...data,
                applicationDate: (data.applicationDate as Timestamp)?.toDate(),
                approvalDate: (data.approvalDate as Timestamp)?.toDate(),
                disbursementDate: (data.disbursementDate as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
            } as Loan);
        });
        callback(loans);
        onComplete();
    }, (error) => {
        console.error("Error listening to loans:", error);
        onComplete();
    });
    return unsubscribe;
};

export const listenToLoan = (id: string, callback: (loan: Loan | null) => void) => {
    const docRef = doc(db, 'cooperativeLoans', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                id: docSnap.id,
                ...data,
                applicationDate: (data.applicationDate as Timestamp).toDate(),
                approvalDate: (data.approvalDate as Timestamp)?.toDate(),
                disbursementDate: (data.disbursementDate as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp).toDate(),
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
            } as Loan);
        } else {
            callback(null);
        }
    });
    return unsubscribe;
}

export const getLoan = async (id: string): Promise<Loan | null> => {
    const docRef = doc(db, 'cooperativeLoans', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            applicationDate: (data.applicationDate as Timestamp).toDate(),
            approvalDate: (data.approvalDate as Timestamp)?.toDate(),
            disbursementDate: (data.disbursementDate as Timestamp)?.toDate(),
            createdAt: (data.createdAt as Timestamp).toDate(),
            amount: data.amount || { kip: 0, thb: 0, usd: 0 },
        } as Loan;
    }
    return null;
}

export const listenToCooperativeLoanTypes = (callback: (types: LoanType[]) => void) => {
    const q = query(loanTypesCollectionRef, orderBy('name'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const types: LoanType[] = [];
        querySnapshot.forEach((doc) => {
            types.push({ id: doc.id, ...doc.data() } as LoanType);
        });
        callback(types);
    });
    return unsubscribe;
};

export const addLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'status'>) => {
    const newLoan = {
        ...loanData,
        status: 'active',
        createdAt: serverTimestamp(),
        applicationDate: Timestamp.fromDate(loanData.applicationDate),
    };
    const docRef = await addDoc(loansCollectionRef, newLoan);
    return docRef.id;
};

export const updateLoan = async (loanId: string, updates: Partial<Omit<Loan, 'id'>>) => {
    const loanDocRef = doc(db, 'cooperativeLoans', loanId);
    await updateDoc(loanDocRef, updates);
};

export const deleteLoan = async (loanId: string) => {
    const batch = writeBatch(db);

    const loanDocRef = doc(db, 'cooperativeLoans', loanId);
    batch.delete(loanDocRef);

    const repaymentsQuery = query(repaymentsCollectionRef, where('loanId', '==', loanId));
    const repaymentDocs = await getDocs(repaymentsQuery);
    repaymentDocs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

export const listenToAllRepayments = (callback: (repayments: LoanRepayment[]) => void) => {
    const q = query(repaymentsCollectionRef, orderBy('repaymentDate', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const repayments: LoanRepayment[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            repayments.push({
                id: doc.id,
                ...data,
                repaymentDate: (data.repaymentDate as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                amountPaid: data.amountPaid || { kip: 0, thb: 0, usd: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        callback(repayments);
    });
    return unsubscribe;
};

export const listenToRepaymentsForLoan = (loanId: string, callback: (repayments: LoanRepayment[]) => void) => {
    const q = query(repaymentsCollectionRef, where('loanId', '==', loanId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const repayments: LoanRepayment[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            repayments.push({
                id: doc.id,
                ...data,
                repaymentDate: (data.repaymentDate as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                amountPaid: data.amountPaid || { kip: 0, thb: 0, usd: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        // Sort on the client-side
        repayments.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime());
        callback(repayments);
    });
    return unsubscribe;
};

export const addLoanRepayment = async (loanId: string, repayments: {amount: { kip: number, thb: number, usd: number }; date: Date, note?: string}[]) => {
    const batch = writeBatch(db);
    
    repayments.forEach(r => {
        const newRepaymentRef = doc(repaymentsCollectionRef);
        batch.set(newRepaymentRef, {
            loanId,
            repaymentDate: Timestamp.fromDate(r.date),
            amountPaid: r.amount,
            note: r.note || '',
            createdAt: serverTimestamp(),
        });
    });
    
    await batch.commit();
};

