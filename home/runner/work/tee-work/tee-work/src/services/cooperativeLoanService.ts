

import { db } from '@/lib/firebase';
import type { Loan, LoanRepayment, LoanType, CurrencyValues } from '@/lib/types';
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
const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd'];
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
                createdAt: (data.createdAt as Timestamp)?.toDate()
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

export const addLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'status' | 'loanTypeId'>) => {
    const newLoan = {
        ...loanData,
        loanTypeId: '', 
        status: 'submitted',
        createdAt: serverTimestamp(),
        applicationDate: Timestamp.fromDate(loanData.applicationDate),
    };
    const docRef = await addDoc(loansCollectionRef, newLoan);
    return docRef.id;
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
                createdAt: (data.createdAt as Timestamp)?.toDate()
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
                createdAt: (data.createdAt as Timestamp)?.toDate()
            } as LoanRepayment);
        });
        // Sort on the client-side
        repayments.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime());
        callback(repayments);
    });
    return unsubscribe;
};

export const addLoanRepayment = async (loanId: string, repayments: {amount: number; date: Date}[]) => {
    await runTransaction(db, async (transaction) => {
        const loanRef = doc(db, 'cooperativeLoans', loanId);
        const loanDoc = await transaction.get(loanRef);

        if (!loanDoc.exists()) {
            throw new Error("Loan not found");
        }

        const loan = loanDoc.data() as Loan;
        
        const q = query(repaymentsCollectionRef, where("loanId", "==", loanId), orderBy('repaymentDate', 'desc'), limit(1));
        const repaymentSnapshot = await getDocs(q);
        
        const lastRepaymentDoc = repaymentSnapshot.docs.length > 0 ? repaymentSnapshot.docs[0] : null;
        const lastRepayment = lastRepaymentDoc ? (lastRepaymentDoc.data() as LoanRepayment) : null;

        const totalLoanAmountWithInterest = loan.amount * (1 + (loan.interestRate || 0) / 100);

        let currentBalance = lastRepayment 
            ? lastRepayment.outstandingBalance 
            : totalLoanAmountWithInterest;
            
        const sortedNewRepayments = repayments.sort((a,b) => a.date.getTime() - b.date.getTime());

        for (const repayment of sortedNewRepayments) {
            const principal = repayment.amount;
            const newOutstandingBalance = currentBalance - principal;
            
            const newRepaymentRef = doc(repaymentsCollectionRef);
            transaction.set(newRepaymentRef, {
                loanId,
                repaymentDate: Timestamp.fromDate(repayment.date),
                amountPaid: repayment.amount,
                principal: principal,
                interest: 0,
                outstandingBalance: newOutstandingBalance,
                createdAt: serverTimestamp(),
            });

            currentBalance = newOutstandingBalance;
        }
        
        if (currentBalance <= 0) {
            transaction.update(loanRef, { status: 'paid_off' });
        }
    });
};
