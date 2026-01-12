
import { db } from '@/lib/firebase';
import type { Loan, LoanRepayment, CurrencyValues } from '@/lib/types';
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
    updateDoc,
    deleteDoc,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import { createTransaction } from './cooperativeAccountingService';

const loansCollectionRef = collection(db, 'cooperativeLoans');
const repaymentsCollectionRef = collection(db, 'cooperativeLoanRepayments');
const currencies: (keyof Loan['amount'])[] = ['kip', 'thb', 'usd', 'cny'];


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
                amount: data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
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
                amount: data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
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
            createdAt: (data.createdAt as Timestamp).toDate(),
            amount: data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
            repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0, cny: 0 },
        } as Loan;
    }
    return null;
}

export const addLoan = async (loanData: Omit<Loan, 'id' | 'createdAt' | 'status'>) => {
    const newLoan = {
        ...loanData,
        status: 'active',
        createdAt: serverTimestamp(),
        applicationDate: Timestamp.fromDate(loanData.applicationDate),
    };
    const docRef = await addDoc(loansCollectionRef, newLoan);
    
    const receivableAccount = loanData.loanType === 'MURABAHA' ? 'murabaha_receivable' : 'qard_hasan_receivable';

    await createTransaction(
        receivableAccount,
        'cash',
        newLoan.amount,
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
                amountPaid: data.amountPaid || { kip: 0, thb: 0, usd: 0, cny: 0 },
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
                amountPaid: data.amountPaid || { kip: 0, thb: 0, usd: 0, cny: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        // Sort on the client-side
        repayments.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime());
        callback(repayments);
    });
    return unsubscribe;
};

export const addLoanRepayment = async (loanId: string, repayments: {amount: CurrencyValues; date: Date, note?: string}[]) => {
  const batch = writeBatch(db);
  const loanDoc = await getLoan(loanId);
  if (!loanDoc) throw new Error("Loan not found");

  for (const r of repayments) {
    const newRepaymentRef = doc(repaymentsCollectionRef);
    const amountPaid = { kip: r.amount.kip || 0, thb: r.amount.thb || 0, usd: r.amount.usd || 0, cny: r.amount.cny || 0 };
    
    batch.set(newRepaymentRef, {
        loanId,
        repaymentDate: Timestamp.fromDate(r.date),
        amountPaid: amountPaid,
        note: r.note || '',
        createdAt: serverTimestamp(),
    });

    const receivableAccount = loanDoc.loanType === 'MURABAHA' ? 'murabaha_receivable' : 'qard_hasan_receivable';
    
     await createTransaction(
        'cash',
        receivableAccount,
        amountPaid,
        `Repayment for Loan #${loanDoc.loanCode} - ${r.note || ''}`,
        r.date
      );
  }
  await batch.commit();
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
