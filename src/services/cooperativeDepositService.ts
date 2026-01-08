
import { db } from '@/lib/firebase';
import type { CooperativeDeposit } from '@/lib/types';
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
    increment
} from 'firebase/firestore';
import { startOfDay } from 'date-fns';

const depositsCollectionRef = collection(db, 'cooperativeDeposits');
const membersCollectionRef = collection(db, 'cooperativeMembers');

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
        const depositWithTimestamp = {
            ...deposit,
            date: Timestamp.fromDate(deposit.date),
            createdAt: serverTimestamp()
        };
        transaction.set(depositDocRef, depositWithTimestamp);

    });
};

export const deleteCooperativeDeposit = async (id: string) => {
     await runTransaction(db, async (transaction) => {
        const depositDocRef = doc(depositsCollectionRef, id);
        const depositDoc = await transaction.get(depositDocRef);

        if (!depositDoc.exists()) {
            throw new Error("Deposit record not found.");
        }

        const depositData = depositDoc.data() as CooperativeDeposit;

        transaction.delete(depositDocRef);
        
    });
};
