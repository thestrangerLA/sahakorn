
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
    runTransaction,
    writeBatch
} from 'firebase/firestore';
import { startOfDay } from 'date-fns';
import { recordUserAction } from './cooperativeAccountingService';

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

export const addCooperativeDeposit = async (deposit: Omit<CooperativeDeposit, 'id' | 'createdAt'>) => {
    
    await runTransaction(db, async (transaction) => {
        const depositDocRef = doc(depositsCollectionRef);
        
        const depositAmount: CurrencyValues = {
            kip: deposit.kip || 0,
            thb: deposit.thb || 0,
            usd: deposit.usd || 0,
            cny: 0, // Assuming cny is not part of member deposits for now
        };

        const depositWithTimestamp = {
            ...deposit,
            date: Timestamp.fromDate(deposit.date),
            createdAt: serverTimestamp()
        };
        transaction.set(depositDocRef, depositWithTimestamp);
        
        // This is where we create the journal entry
        await recordUserAction({
            action: deposit.kip < 0 || deposit.thb < 0 || deposit.usd < 0 ? 'MEMBER_WITHDRAW' : 'MEMBER_DEPOSIT',
            amount: {
                kip: Math.abs(deposit.kip),
                thb: Math.abs(deposit.thb),
                usd: Math.abs(deposit.usd),
                cny: 0
            },
            description: `Deposit by ${deposit.memberName}`,
            date: deposit.date
        });
    });
};

export const deleteCooperativeDeposit = async (id: string) => {
    const depositDocRef = doc(depositsCollectionRef, id);
    await deleteDoc(depositDocRef);
    // Note: This does not automatically reverse the associated journal entry.
    // A more robust system would store the transactionGroupId on the deposit and call deleteTransactionGroup here.
};

