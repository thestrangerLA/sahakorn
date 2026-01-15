
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
    writeBatch,
    QueryConstraint
} from 'firebase/firestore';
import { recordUserAction, deleteTransactionGroup } from './cooperativeAccountingService';
import { toDateSafe } from '@/lib/timestamp';

const loansCollectionRef = collection(db, 'cooperativeLoans');
const repaymentsCollectionRef = collection(db, 'cooperativeLoanRepayments');
const currencies: (keyof Omit<CurrencyValues, 'cny'>)[] = ['kip', 'thb', 'usd'];

// Helper function to sort loans client-side
function sortLoans(
    loans: Loan[], 
    field: 'applicationDate' | 'createdAt' = 'applicationDate', 
    direction: 'asc' | 'desc' = 'desc'
): Loan[] {
    return loans.sort((a, b) => {
        const dateA = toDateSafe(a[field])?.getTime() ?? 0;
        const dateB = toDateSafe(b[field])?.getTime() ?? 0;
        return direction === 'desc' ? dateB - dateA : dateA - dateB;
    });
}

// Helper function to sort repayments client-side
function sortRepayments(
    repayments: LoanRepayment[], 
    field: 'repaymentDate' | 'createdAt' = 'repaymentDate', 
    direction: 'asc' | 'desc' = 'desc'
): LoanRepayment[] {
    return repayments.sort((a, b) => {
        const dateA = toDateSafe(a[field])?.getTime() ?? 0;
        const dateB = toDateSafe(b[field])?.getTime() ?? 0;
        return direction === 'desc' ? dateB - dateA : dateA - dateB;
    });
}

export const listenToCooperativeLoans = (
    callback: (loans: Loan[]) => void, 
    onComplete: () => void
) => {
    const q = query(loansCollectionRef);
    let isFirstLoad = true;
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loans: Loan[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            loans.push({ 
                id: doc.id, 
                ...data,
                applicationDate: toDateSafe(data.applicationDate) || new Date(),
                createdAt: toDateSafe(data.createdAt) || new Date(),
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
            } as Loan);
        });
        
        const sortedLoans = sortLoans(loans, 'applicationDate', 'desc');
        callback(sortedLoans);

        if (isFirstLoad) {
            onComplete();
            isFirstLoad = false;
        }
    }, (error) => {
        console.error("Error listening to loans:", error);
        onComplete();
    });
    return unsubscribe;
};

export const listenToLoansByMember = (memberId: string, callback: (loans: Loan[]) => void) => {
    const q = query(loansCollectionRef, where("memberId", "==", memberId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const loans: Loan[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            loans.push({ 
                id: doc.id, 
                ...data,
                applicationDate: toDateSafe(data.applicationDate) || new Date(),
                createdAt: toDateSafe(data.createdAt) || new Date(),
                amount: data.amount || { kip: 0, thb: 0, usd: 0 },
                repaymentAmount: data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
            } as Loan);
        });
        const sortedLoans = sortLoans(loans, 'applicationDate', 'desc');
        callback(sortedLoans);
    });
    return unsubscribe;
}

export const getAllCooperativeLoanIds = async (): Promise<{ id: string }[]> => {
    const snapshot = await getDocs(loansCollectionRef);
    const ids = snapshot.docs.map(doc => ({ id: doc.id }));
    if (ids.length === 0) {
      return [{ id: 'default' }];
    }
    return ids;
};

export const listenToLoan = (id: string, callback: (loan: Loan | null) => void) => {
    const docRef = doc(db, 'cooperativeLoans', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            callback({
                id: docSnap.id,
                ...data,
                applicationDate: toDateSafe(data.applicationDate) || new Date(),
                createdAt: toDateSafe(data.createdAt) || new Date(),
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
            applicationDate: toDateSafe(data.applicationDate) || new Date(),
            createdAt: toDateSafe(data.createdAt) || new Date(),
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

    const newLoan: any = {
        ...loanData,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        applicationDate: applicationTimestamp,
    };
    
    if (newLoan.memberId === null || newLoan.memberId === undefined) {
        delete newLoan.memberId;
    }
    if (newLoan.debtorName === null || newLoan.debtorName === undefined) {
        delete newLoan.debtorName;
    }

    const docRef = await addDoc(loansCollectionRef, newLoan);

    const actionType: UserAction = 'SELL_MURABAHA';

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
        description: `Disburse Loan #${newLoan.loanCode} for ${loanData.memberId || loanData.debtorName}`,
        date: loanData.applicationDate,
        loanId: docRef.id
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
    
    const accountingQuery = query(collection(db, 'cooperative-transactions'), where('loanId', '==', loanId));
    const accountingDocs = await getDocs(accountingQuery);
    accountingDocs.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
}

export const listenToAllRepayments = (callback: (repayments: LoanRepayment[]) => void) => {
    const q = query(repaymentsCollectionRef);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const repayments: LoanRepayment[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            repayments.push({
                id: doc.id,
                ...data,
                repaymentDate: toDateSafe(data.repaymentDate) || new Date(),
                createdAt: toDateSafe(data.createdAt) || new Date(),
                amountPaid: data.amountPaid || { kip: 0, thb: 0, usd: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        
        const sortedRepayments = sortRepayments(repayments, 'repaymentDate', 'desc');
        callback(sortedRepayments);
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
                repaymentDate: toDateSafe(data.repaymentDate) || new Date(),
                createdAt: toDateSafe(data.createdAt) || new Date(),
                amountPaid: data.amountPaid || { kip: 0, thb: 0, usd: 0 },
                principalPortion: data.principalPortion || { kip: 0, thb: 0, usd: 0 },
                profitPortion: data.profitPortion || { kip: 0, thb: 0, usd: 0 },
                note: data.note || '',
            } as LoanRepayment);
        });
        
        const sortedRepayments = sortRepayments(repayments, 'repaymentDate', 'desc');
        callback(sortedRepayments);
    });
    return unsubscribe;
};

export const recordLoanPayment = async ({ loan, amount, paymentDate, paymentChannel = 'cash' }: { loan: Loan, amount: Omit<CurrencyValues, 'cny'>, paymentDate: Date, paymentChannel?: 'cash' | 'bank_bcel' }): Promise<{ principalPortion: Omit<CurrencyValues, 'cny'>, profitPortion: Omit<CurrencyValues, 'cny'>, transactionGroupId: string }> => {
    const totalRepayments = await getLoanRepayments(loan.id);
    const initialCurrencyValues: Omit<CurrencyValues, 'cny'> = { kip: 0, thb: 0, usd: 0 };
    const totalPaidSoFar = totalRepayments.reduce((acc, r) => {
        currencies.forEach(c => acc[c] += (r.amountPaid[c] || 0));
        return acc;
    }, { ...initialCurrencyValues });

    const principalDue = currencies.reduce((acc, c) => {
        const principalAlreadyPaid = totalRepayments.reduce((sum, r) => sum + (r.principalPortion?.[c] || 0), 0);
        acc[c] = (loan.amount[c] || 0) - principalAlreadyPaid;
        if (acc[c] < 0) acc[c] = 0;
        return acc;
    }, { ...initialCurrencyValues });

    const totalProfitDue = currencies.reduce((acc, c) => {
        const totalProfit = (loan.repaymentAmount[c] || 0) - (loan.amount[c] || 0);
        const profitPaidSoFar = totalRepayments.reduce((sum, r) => sum + (r.profitPortion?.[c] || 0), 0);
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

    const action: UserAction = 'COLLECT_MURABAHA_RECEIVABLE';

    const transactionGroupId = await recordUserAction({
        action,
        amount: { ...principalPortion, cny: 0 },
        profit: loan.loanType === 'MURABAHA' ? { ...profitPortion, cny: 0 } : undefined,
        description: `Repayment for Loan #${loan.loanCode}`,
        date: paymentDate,
        loanId: loan.id,
        paymentChannel: paymentChannel
    });

    return { principalPortion, profitPortion, transactionGroupId };
};

export const addLoanRepayment = async (loanId: string, repayments: {amount: Omit<CurrencyValues, 'cny'>; date: Date, note?: string, paymentChannel?: 'cash' | 'bank_bcel'}[]) => {
  const loanDoc = await getLoan(loanId);
  if (!loanDoc) throw new Error("Loan not found");

  const batch = writeBatch(db);
  
  for (const r of repayments) {
    const newRepaymentRef = doc(repaymentsCollectionRef);
    const amountPaid = { kip: r.amount.kip || 0, thb: r.amount.thb || 0, usd: r.amount.usd || 0 };
    
     const { principalPortion, profitPortion, transactionGroupId } = await recordLoanPayment({
          loan: loanDoc,
          amount: { ...amountPaid },
          paymentDate: r.date,
          paymentChannel: r.paymentChannel || 'cash'
      });

    batch.set(newRepaymentRef, {
        loanId,
        transactionGroupId,
        repaymentDate: Timestamp.fromDate(r.date),
        amountPaid: { ...amountPaid },
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
    
    await runTransaction(db, async (transaction) => {
        const repaymentDoc = await transaction.get(repaymentDocRef);
        if (!repaymentDoc.exists()) {
            throw new Error("Repayment not found");
        }

        const repaymentData = repaymentDoc.data() as LoanRepayment;

        if (repaymentData.transactionGroupId) {
            await deleteTransactionGroup(repaymentData.transactionGroupId);
        }

        transaction.delete(repaymentDocRef);
    });
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
      repaymentDate: toDateSafe(data.repaymentDate) || new Date(),
      createdAt: toDateSafe(data.createdAt) || new Date(),
    } as LoanRepayment);
  });
  return repayments;
}
