
import { db } from '@/lib/firebase';
import type { CooperativeDeposit, CurrencyValues } from '@/lib/types';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    doc, 
    deleteDoc, 
    orderBy,
    serverTimestamp,
    Timestamp,
    runTransaction
} from 'firebase/firestore';
import { recordUserAction, deleteTransactionGroup } from './cooperativeAccountingService';

const depositsCollectionRef = collection(db, 'cooperativeDeposits');

export const listenToCooperativeDeposits = (callback: (items: CooperativeDeposit[]) => void) => {
    const q = query(depositsCollectionRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const deposits: CooperativeDeposit[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            deposits.push({ 
                id: doc.id, 
                ...data,
                date: (data.date as Timestamp).toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                kip: data.kip || 0,
                thb: data.thb || 0,
                usd: data.usd || 0,
            } as CooperativeDeposit);
        });
        callback(deposits);
    });
    return unsubscribe;
};

export const addCooperativeDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt' | 'transactionGroupId'>) => {
    // Determine if it's a deposit or withdrawal
    const isWithdrawal = (deposit.kip || 0) < 0 || (deposit.thb || 0) < 0 || (deposit.usd || 0) < 0;
    const actionType = isWithdrawal ? 'MEMBER_WITHDRAW' : 'MEMBER_DEPOSIT';

    // 1. Create the journal entry first and get the transaction group ID
    const transactionGroupId = await recordUserAction({
        action: actionType,
        amount: {
            kip: Math.abs(deposit.kip),
            thb: Math.abs(deposit.thb),
            usd: Math.abs(deposit.usd),
            cny: 0,
        },
        description: `${isWithdrawal ? 'Withdrawal' : 'Deposit'} by ${deposit.memberName}`,
        date: deposit.date,
    });

    // 2. Now, add the deposit document with the associated transaction group ID
    const depositWithTimestamp = {
        ...deposit,
        transactionGroupId, // Link to the journal entry
        date: Timestamp.fromDate(deposit.date),
        createdAt: serverTimestamp()
    };
    await addDoc(depositsCollectionRef, depositWithTimestamp);
};


export const deleteCooperativeDeposit = async (id: string) => {
    await runTransaction(db, async (transaction) => {
        const depositDocRef = doc(depositsCollectionRef, id);
        const depositDoc = await transaction.get(depositDocRef);

        if (!depositDoc.exists()) {
            throw new Error("Deposit record not found.");
        }

        const depositData = depositDoc.data() as CooperativeDeposit;

        // If there's an associated transaction group, delete it
        if (depositData.transactionGroupId) {
            await deleteTransactionGroup(depositData.transactionGroupId);
        }
        
        // Delete the deposit document itself
        transaction.delete(depositDocRef);
    });
};
