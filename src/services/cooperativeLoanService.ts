

import { db } from '@/lib/firebase';
import type { Loan, LoanRepayment, Currency, CooperativeMember } from '@/lib/types';
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
import { createTransaction } from './cooperativeAccountingService';

const loansCollectionRef = collection(db, 'cooperativeLoans');
const repaymentsCollectionRef = collection(db, 'cooperativeLoanRepayments');
const currencies: (keyof Loan['principal'])[] = ['kip', 'thb', 'usd'];

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
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                principal: data.principal || { kip: 0, thb: 0, usd: 0 },
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
                createdAt: (data.createdAt as Timestamp).toDate(),
                principal: data.principal || { kip: 0, thb: 0, usd: 0 },
            } as Loan);
        } else {
            callback(null);
        }
    });
    return unsubscribe;
}

export const addLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'status'>) => {
    const newLoan = {
        ...loanData,
        principal: {
            kip: loanData.principal.kip || 0,
            thb: loanData.principal.thb || 0,
            usd: loanData.principal.usd || 0,
            cny: 0,
        },
        status: 'active',
        createdAt: serverTimestamp(),
        applicationDate: Timestamp.fromDate(loanData.applicationDate),
    };
    const docRef = await addDoc(loansCollectionRef, newLoan);

    // Create accounting transaction for loan disbursement
    await createTransaction(
        'loan_receivable',
        'cash',
        newLoan.principal,
        `Disburse Loan #${newLoan.loanCode}`,
        newLoan.applicationDate.toDate()
    );

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
                principalPaid: data.principalPaid || { kip: 0, thb: 0, usd: 0, cny: 0 },
                interestPaid: data.interestPaid || { kip: 0, thb: 0, usd: 0, cny: 0 },
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
                principalPaid: data.principalPaid || { kip: 0, thb: 0, usd: 0, cny: 0 },
                interestPaid: data.interestPaid || { kip: 0, thb: 0, usd: 0, cny: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        // Sort on the client-side
        repayments.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime());
        callback(repayments);
    });
    return unsubscribe;
};

export const repayLoan = async (loanId: string, repayments: { principalPaid: Currency, interestPaid: Currency, date: Date, note?: string }[]) => {
    for (const r of repayments) {
        // Create repayment document
        await addDoc(repaymentsCollectionRef, {
            loanId,
            repaymentDate: Timestamp.fromDate(r.date),
            principalPaid: r.principalPaid,
            interestPaid: r.interestPaid,
            note: r.note || '',
            createdAt: serverTimestamp(),
        });

        // Accounting for principal repayment
        if (Object.values(r.principalPaid).some(v => v > 0)) {
            await createTransaction(
                'cash',
                'loan_receivable',
                r.principalPaid,
                `Repay Principal Loan#${loanId.substring(0, 5)} - ${r.note || ''}`,
                r.date
            );
        }

        // Accounting for interest repayment
        if (Object.values(r.interestPaid).some(v => v > 0)) {
            await createTransaction(
                'cash',
                'interest_income',
                r.interestPaid,
                `Repay Interest Loan#${loanId.substring(0, 5)} - ${r.note || ''}`,
                r.date
            );
        }
    }
};

export const deleteLoanRepayment = async (repaymentId: string) => {
    const repaymentDocRef = doc(repaymentsCollectionRef, repaymentId);
    await deleteDoc(repaymentDocRef);
};

export const updateLoanRepayment = async (repaymentId: string, updatedFields: Partial<Omit<LoanRepayment, 'id' | 'createdAt' | 'loanId'>>) => {
    const repaymentDocRef = doc(repaymentsCollectionRef, repaymentId);
    const dataToUpdate: any = { ...updatedFields };
    if (updatedFields.repaymentDate) {
        dataToUpdate.repaymentDate = Timestamp.fromDate(updatedFields.repaymentDate);
    }
    await updateDoc(repaymentDocRef, dataToUpdate);
};
