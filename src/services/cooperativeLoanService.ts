

import { db } from '@/lib/firebase';
import type { Loan, LoanRepayment, CurrencyValues, UserAction } from '@/lib/types';
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
import { recordUserAction } from './cooperativeAccountingService';

const loansCollectionRef = collection(db, 'cooperativeLoans');
const repaymentsCollectionRef = collection(db, 'cooperativeLoanRepayments');
const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];


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
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
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

export const listenToLoansByMember = (memberId: string, callback: (loans: Loan[]) => void) => {
    const q = query(loansCollectionRef, where("memberId", "==", memberId), orderBy('applicationDate', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loans: Loan[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            loans.push({ 
                id: doc.id, 
                ...data,
                applicationDate: (data.applicationDate as Timestamp)?.toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
            } as Loan);
        });
        callback(loans);
    });
    return unsubscribe;
}


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
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
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
            amount: data.amount || { kip: 0, thb: 0, usd: 0 },
            repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
        } as Loan;
    }
    return null;
}

export const addLoan = async (
  loanData: Omit<Loan, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
    const applicationTimestamp = Timestamp.fromDate(loanData.applicationDate);

    // Create a mutable copy to clean up undefined fields
    const newLoan: any = {
        ...loanData,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        applicationDate: applicationTimestamp,
    };
    
    // Firestore doesn't allow 'undefined' fields. Clean them up.
    if (newLoan.memberId === null || newLoan.memberId === undefined) {
        delete newLoan.memberId;
    }
    if (newLoan.debtorName === null || newLoan.debtorName === undefined) {
        delete newLoan.debtorName;
    }


    const docRef = await addDoc(loansCollectionRef, newLoan);

    const actionType =
        loanData.loanType === 'MURABAHA'
            ? 'SELL_MURABAHA'
            : 'QARD_HASAN_GIVE';

    const profit = currencies.reduce((acc, c) => {
        const key = c as keyof Omit<CurrencyValues, 'cny'>;
        acc[key] =
            (loanData.repaymentAmount[key] || 0) -
            (loanData.amount[key] || 0);
        return acc;
    }, { kip: 0, thb: 0, usd: 0 } as Omit<CurrencyValues, 'cny'>);

    await recordUserAction({
        action: actionType,
        amount: { ...newLoan.amount, cny: 0 },
        profit: actionType === 'SELL_MURABAHA' ? { ...profit, cny: 0 } : undefined,
        description: `Disburse Loan #${newLoan.loanCode} for ${loanData.memberId ? loanData.memberId : loanData.debtorName}`,
        date: loanData.applicationDate, // Use original Date object
    });

    return docRef.id;
};


export const updateLoan = async (loanId: string, updates: Partial<Omit<Loan, 'id' | 'createdAt'>>) => {
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
                principalPortion: data.principalPortion || { kip: 0, thb: 0, usd: 0 },
                profitPortion: data.profitPortion || { kip: 0, thb: 0, usd: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        // Sort on the client-side
        repayments.sort((a, b) => b.repaymentDate.getTime() - a.repaymentDate.getTime());
        callback(repayments);
    });
    return unsubscribe;
};

export const recordLoanPayment = async ({ loan, amount, paymentDate }: { loan: Loan, amount: Omit<CurrencyValues, 'cny'>, paymentDate: Date }) => {
    const totalRepayments = await getLoanRepayments(loan.id);
    const initialCurrencyValues: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
    const totalPaidSoFar = totalRepayments.reduce((acc, r) => {
        currencies.forEach(c => acc[c] += (r.amountPaid[c] || 0));
        return acc;
    }, { ...initialCurrencyValues });

    const principalDue = currencies.reduce((acc, c) => {
        acc[c] = (loan.amount[c] || 0) - totalPaidSoFar[c];
        if (acc[c] < 0) acc[c] = 0;
        return acc;
    }, { ...initialCurrencyValues });

    const totalProfitDue = currencies.reduce((acc, c) => {
        const totalProfit = (loan.repaymentAmount[c] || 0) - (loan.amount[c] || 0);
        const profitPaidSoFar = currencies.reduce((sum, cur) => sum + (totalPaidSoFar[cur] > (loan.amount[cur] || 0) ? totalPaidSoFar[cur] - (loan.amount[cur] || 0) : 0), 0);
        acc[c] = totalProfit - profitPaidSoFar;
        if (acc[c] < 0) acc[c] = 0;
        return acc;
    }, { ...initialCurrencyValues });


    const principalPortion = { ...initialCurrencyValues };
    const profitPortion = { ...initialCurrencyValues };
    
    currencies.forEach(c => {
        const paymentAmount = amount[c] || 0;
        const principalToPay = Math.min(paymentAmount, principalDue[c]);
        principalPortion[c] = principalToPay;
        const remainingPayment = paymentAmount - principalToPay;
        profitPortion[c] = Math.min(remainingPayment, totalProfitDue[c]);
    });

    const action: UserAction = loan.loanType === 'MURABAHA' ? 'COLLECT_MURABAHA_RECEIVABLE' : 'QARD_HASAN_RECEIVE';

    await recordUserAction({
        action,
        amount: { ...principalPortion, cny: 0 },
        profit: loan.loanType === 'MURABAHA' ? { ...profitPortion, cny: 0 } : undefined,
        description: `Repayment for Loan #${loan.loanCode}`,
        date: paymentDate
    });

    return { principalPortion, profitPortion };
};

export const addLoanRepayment = async (loanId: string, repayments: {amount: Omit<CurrencyValues, 'cny'>; date: Date, note?: string}[]) => {
  const loanDoc = await getLoan(loanId);
  if (!loanDoc) throw new Error("Loan not found");

  const batch = writeBatch(db);
  
  for (const r of repayments) {
    const newRepaymentRef = doc(repaymentsCollectionRef);
    const amountPaid = { kip: r.amount.kip || 0, thb: r.amount.thb || 0, usd: r.amount.usd || 0 };
    
     const { principalPortion, profitPortion } = await recordLoanPayment({
          loan: loanDoc,
          amount: { ...amountPaid, cny: 0 },
          paymentDate: r.date
      });

    batch.set(newRepaymentRef, {
        loanId,
        repaymentDate: Timestamp.fromDate(r.date),
        amountPaid: { ...amountPaid, cny: 0 },
        principalPortion,
        profitPortion,
        note: r.note || '',
        createdAt: serverTimestamp(),
    });
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

async function getLoanRepayments(loanId: string): Promise<LoanRepayment[]> {
  const q = query(repaymentsCollectionRef, where('loanId', '==', loanId));
  const querySnapshot = await getDocs(q);
  const repayments: LoanRepayment[] = [];
  querySnapshot.forEach(doc => {
    const data = doc.data();
    repayments.push({
      id: doc.id,
      ...data,
      repaymentDate: (data.repaymentDate as Timestamp).toDate(),
      createdAt: (data.createdAt as Timestamp).toDate(),
    } as LoanRepayment);
  });
  return repayments;
}
