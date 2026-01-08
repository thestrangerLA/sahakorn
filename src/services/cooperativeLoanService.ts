
import { db } from '@/lib/firebase';
import type { Loan, LoanRepayment, LoanType } from '@/lib/types';
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
} from 'firebase/firestore';

const loansCollectionRef = collection(db, 'cooperativeLoans');
const loanTypesCollectionRef = collection(db, 'cooperativeLoanTypes');
const repaymentsCollectionRef = collection(db, 'cooperativeLoanRepayments');

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
        status: 'submitted',
        createdAt: serverTimestamp(),
        applicationDate: Timestamp.fromDate(loanData.applicationDate),
    };
    const docRef = await addDoc(loansCollectionRef, newLoan);
    return docRef.id;
};

export const listenToRepaymentsForLoan = (loanId: string, callback: (repayments: LoanRepayment[]) => void) => {
    const q = query(repaymentsCollectionRef, where('loanId', '==', loanId), orderBy('repaymentDate', 'desc'));
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
