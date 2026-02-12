
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
import { recordUserAction, deleteTransactionGroup, createJournalTransaction } from './cooperativeAccountingService';
import { toDateSafe } from '@/lib/timestamp';
import { v4 as uuidv4 } from 'uuid';

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
    const q = query(loansCollectionRef); // No server-side orderBy
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
                outstandingBalance: data.outstandingBalance || data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
                totalPrincipalPaid: data.totalPrincipalPaid || { kip: 0, thb: 0, usd: 0 },
                totalProfitPaid: data.totalProfitPaid || { kip: 0, thb: 0, usd: 0 },
                profitRecorded: data.profitRecorded || false,
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
    const q = query(loansCollectionRef, where("memberId", "==", memberId)); // No server-side orderBy
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
                outstandingBalance: data.outstandingBalance || data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
                totalPrincipalPaid: data.totalPrincipalPaid || { kip: 0, thb: 0, usd: 0 },
                totalProfitPaid: data.totalProfitPaid || { kip: 0, thb: 0, usd: 0 },
                profitRecorded: data.profitRecorded || false,
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
                outstandingBalance: data.outstandingBalance || data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
                totalPrincipalPaid: data.totalPrincipalPaid || { kip: 0, thb: 0, usd: 0 },
                totalProfitPaid: data.totalProfitPaid || { kip: 0, thb: 0, usd: 0 },
                profitRecorded: data.profitRecorded || false,
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
            outstandingBalance: data.outstandingBalance || data.repaymentAmount || data.amount || { kip: 0, thb: 0, usd: 0 },
            totalPrincipalPaid: data.totalPrincipalPaid || { kip: 0, thb: 0, usd: 0 },
            totalProfitPaid: data.totalProfitPaid || { kip: 0, thb: 0, usd: 0 },
            profitRecorded: data.profitRecorded || false,
        } as Loan;
    }
    return null;
}

export const addLoan = async (
  loanData: Omit<Loan, 'id' | 'createdAt' | 'status' | 'outstandingBalance' | 'totalPrincipalPaid' | 'totalProfitPaid' | 'profitRecorded'>
): Promise<string> => {
    const applicationTimestamp = Timestamp.fromDate(loanData.applicationDate);

    const newLoan: any = {
        ...loanData,
        status: 'active' as const,
        createdAt: serverTimestamp(),
        applicationDate: applicationTimestamp,
        profitRecorded: false, // Initialize as false
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
    const dataToUpdate: { [key: string]: any } = { ...updates };
    if (updates.applicationDate) {
        const newDate = toDateSafe(updates.applicationDate);
        if (newDate) {
            dataToUpdate.applicationDate = Timestamp.fromDate(newDate);
        } else {
            delete dataToUpdate.applicationDate;
        }
    }
    await updateDoc(loanDocRef, dataToUpdate);
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
    const q = query(repaymentsCollectionRef); // No server-side orderBy
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
    const q = query(repaymentsCollectionRef, where('loanId', '==', loanId)); // No server-side orderBy
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

export const addLoanRepayment = async (
  loanId: string,
  repayments: {
    amount: Omit<CurrencyValues, 'cny'>;
    date: Date;
    note?: string;
    paymentChannel?: 'cash' | 'bank_bcel';
  }[]
) => {
  await runTransaction(db, async (tx) => {
    const loanRef = doc(db, 'cooperativeLoans', loanId);
    const loanSnap = await tx.get(loanRef);
    if (!loanSnap.exists()) throw new Error('Loan not found');

    const loan = loanSnap.data() as Loan;
    const wasAlreadySettled = loan.status === 'settled';

    // Initialize running totals from the loan document for this transaction batch
    let currentTotalPrincipalPaid = loan.totalPrincipalPaid || { kip: 0, thb: 0, usd: 0 };
    let currentTotalProfitPaid = loan.totalProfitPaid || { kip: 0, thb: 0, usd: 0 };

    for (const r of repayments) {
      const amountPaid = {
        kip: r.amount.kip || 0,
        thb: r.amount.thb || 0,
        usd: r.amount.usd || 0,
      };

      const principalPortion = { kip: 0, thb: 0, usd: 0 };
      const profitPortion = { kip: 0, thb: 0, usd: 0 };

      currencies.forEach(c => {
        let paid = amountPaid[c];
        if (paid <= 0) return;

        // Calculate remaining profit *before* this specific repayment
        const totalProfitForLoan = (loan.repaymentAmount[c] || 0) - (loan.amount[c] || 0);
        const profitAlreadyPaid = currentTotalProfitPaid[c] || 0;
        const profitRemaining = totalProfitForLoan - profitAlreadyPaid;

        const profitToPayNow = Math.min(paid, Math.max(0, profitRemaining));
        profitPortion[c] = profitToPayNow;
        paid -= profitToPayNow;

        // Remaining amount goes to principal
        const principalToPayNow = paid;
        principalPortion[c] = principalToPayNow;
      });
      
      const transactionGroupId = await recordUserAction({
        action: 'COLLECT_MURABAHA_RECEIVABLE',
        amount: { ...amountPaid, cny: 0 },
        profit: undefined,
        description: `Repayment for Loan #${loan.loanCode}`,
        date: r.date,
        loanId,
        paymentChannel: r.paymentChannel || 'cash',
      }, tx);


      // Create the repayment document
      const repayRef = doc(repaymentsCollectionRef);
      const outstandingBalanceAfterThisRepayment = currencies.reduce((acc, c) => {
          const totalRepayable = loan.repaymentAmount[c] || 0;
          const totalPrincipalNow = currentTotalPrincipalPaid[c] + principalPortion[c];
          const totalProfitNow = currentTotalProfitPaid[c] + profitPortion[c];
          acc[c] = totalRepayable - (totalPrincipalNow + totalProfitNow);
          return acc;
      }, { kip: 0, thb: 0, usd: 0 });

      tx.set(repayRef, {
        loanId,
        transactionGroupId,
        repaymentDate: Timestamp.fromDate(r.date),
        amountPaid,
        principalPortion,
        profitPortion,
        outstandingBalance: outstandingBalanceAfterThisRepayment,
        note: r.note || '',
        createdAt: serverTimestamp(),
      });
      
      // Update running totals for the next repayment in the batch
      currencies.forEach(c => {
          currentTotalPrincipalPaid[c] += principalPortion[c];
          currentTotalProfitPaid[c] += profitPortion[c];
      });
    }

    // Finally, update the loan document with the final aggregated totals and status
    const finalOutstandingBalance = currencies.reduce((acc, c) => {
      acc[c] = (loan.repaymentAmount[c] || 0) - (currentTotalPrincipalPaid[c] + currentTotalProfitPaid[c]);
      return acc;
    }, { kip: 0, thb: 0, usd: 0 });

    const isNowSettled = Object.values(finalOutstandingBalance).every(v => v <= 0.01);
    
    // If the loan becomes settled with this payment, recognize the deferred income.
    if (isNowSettled && !wasAlreadySettled) {
        const totalProfit = currencies.reduce((acc, c) => {
            acc[c] = (loan.repaymentAmount[c] || 0) - (loan.amount[c] || 0);
            return acc;
        }, { kip: 0, thb: 0, usd: 0 });

        const totalProfitValue = Object.values(totalProfit).reduce((a, b) => a + b, 0);

        if (totalProfitValue > 0) {
            await createJournalTransaction({
                debitAccountId: 'deferred_murabaha_income',
                creditAccountId: 'sales_income',
                amount: { ...totalProfit, cny: 0 },
                description: `ກຳໄລຈາກສິນເຊື່ອ #${loan.loanCode}`,
                date: repayments[repayments.length - 1].date, // Use the date of the final repayment
                userAction: 'RECOGNIZE_MURABAHA_PROFIT',
                contractType: 'MURABAHA',
                systemGenerated: true,
                loanId: loanId,
            }, tx);
        }
    }


    tx.update(loanRef, {
      outstandingBalance: finalOutstandingBalance,
      status: isNowSettled ? 'settled' : 'active',
      totalPrincipalPaid: currentTotalPrincipalPaid,
      totalProfitPaid: currentTotalProfitPaid,
      profitRecorded: isNowSettled,
    });
  });
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

        // Must also update the loan's aggregate values
        const loanRef = doc(db, 'cooperativeLoans', repaymentData.loanId);
        const loanSnap = await transaction.get(loanRef);
        if (loanSnap.exists()) {
            const loanData = loanSnap.data() as Loan;
            const newTotalPrincipalPaid = { ... (loanData.totalPrincipalPaid || { kip: 0, thb: 0, usd: 0 }) };
            const newTotalProfitPaid = { ... (loanData.totalProfitPaid || { kip: 0, thb: 0, usd: 0 }) };

            currencies.forEach(c => {
                newTotalPrincipalPaid[c] -= repaymentData.principalPortion?.[c] || 0;
                newTotalProfitPaid[c] -= repaymentData.profitPortion?.[c] || 0;
            });
            
            const newOutstandingBalance = currencies.reduce((acc, c) => {
                acc[c] = (loanData.repaymentAmount[c] || 0) - (newTotalPrincipalPaid[c] + newTotalProfitPaid[c]);
                return acc;
            }, { kip: 0, thb: 0, usd: 0 });

            transaction.update(loanRef, {
                totalPrincipalPaid: newTotalPrincipalPaid,
                totalProfitPaid: newTotalProfitPaid,
                outstandingBalance: newOutstandingBalance,
                status: 'active' // Revert status to active
            });
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
