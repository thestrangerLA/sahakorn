
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
    getDoc,
    runTransaction,
    increment,
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
        loanTypeId: '', // Since we removed it
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

export const addLoanRepayment = async (loanId: string, amountPaid: number, repaymentDate: Date) => {
    await runTransaction(db, async (transaction) => {
        const loanRef = doc(db, 'cooperativeLoans', loanId);
        const loanDoc = await transaction.get(loanRef);

        if (!loanDoc.exists()) {
            throw new Error("Loan not found");
        }

        const loan = loanDoc.data() as Loan;
        const monthlyInterestRate = loan.interestRate / 100 / 12;

        const repaymentsQuery = query(repaymentsCollectionRef, where('loanId', '==', loanId), orderBy('repaymentDate', 'desc'));
        const repaymentsSnapshot = await getDocs(repaymentsQuery);
        const allRepayments = repaymentsSnapshot.docs.map(doc => doc.data() as LoanRepayment);
        
        const totalPrincipalPaid = allRepayments.reduce((sum, r) => sum + r.principal, 0);
        const currentBalance = loan.amount - totalPrincipalPaid;
        
        if (amountPaid > currentBalance) {
            // This is a simple check. A more complex system might allow overpayment.
            // For now, we'll just log a warning and cap the payment.
            console.warn("Payment amount is greater than outstanding balance. Adjusting payment.");
            amountPaid = currentBalance;
        }

        const interest = currentBalance * monthlyInterestRate;
        let principal = amountPaid - interest;

        if (principal < 0) {
            principal = 0; // The payment only covered some interest
        }
        if(principal > currentBalance){
            principal = currentBalance;
        }
        
        const newOutstandingBalance = currentBalance - principal;
        
        const newRepaymentRef = doc(repaymentsCollectionRef);
        transaction.set(newRepaymentRef, {
            loanId,
            repaymentDate: Timestamp.fromDate(repaymentDate),
            amountPaid,
            principal,
            interest,
            outstandingBalance: newOutstandingBalance,
            createdAt: serverTimestamp(),
        });
        
        // Update loan status if fully paid
        if (newOutstandingBalance <= 0) {
            transaction.update(loanRef, { status: 'paid_off' });
        }
    });
};
