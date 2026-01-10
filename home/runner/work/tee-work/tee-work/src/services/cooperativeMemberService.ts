

import { db } from '@/lib/firebase';
import type { CooperativeMember, CooperativeDeposit, Loan } from '@/lib/types';
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    doc, 
    updateDoc, 
    deleteDoc, 
    orderBy,
    serverTimestamp,
    Timestamp,
    getDocs,
    getDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import { startOfDay } from 'date-fns';

const membersCollectionRef = collection(db, 'cooperativeMembers');
const depositsCollectionRef = collection(db, 'cooperativeDeposits');
const loansCollectionRef = collection(db, 'cooperativeLoans');


export const listenToCooperativeMembers = (callback: (items: CooperativeMember[]) => void) => {
    const q = query(membersCollectionRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const members: CooperativeMember[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            members.push({ 
                id: doc.id, 
                ...data,
                joinDate: (data.joinDate as Timestamp).toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate(),
                deposits: data.deposits || { kip: 0, thb: 0, usd: 0 },
            } as CooperativeMember);
        });
        callback(members);
    });
    return unsubscribe;
};

export const addCooperativeMember = async (member: Omit<CooperativeMember, 'id' | 'createdAt'>) => {
    const memberWithTimestamp = {
        ...member,
        joinDate: Timestamp.fromDate(member.joinDate),
        createdAt: serverTimestamp(),
        deposits: member.deposits || { kip: 0, thb: 0, usd: 0 }
    };
    await addDoc(membersCollectionRef, memberWithTimestamp);
};

export const updateCooperativeMember = async (id: string, updatedFields: Partial<Omit<CooperativeMember, 'id' | 'createdAt'>>) => {
    const memberDoc = doc(db, 'cooperativeMembers', id);
    const dataToUpdate: any = { ...updatedFields };

    if (updatedFields.joinDate && updatedFields.joinDate instanceof Date) {
        dataToUpdate.joinDate = Timestamp.fromDate(startOfDay(updatedFields.joinDate));
    }
    
    await updateDoc(memberDoc, dataToUpdate);
};

export const deleteCooperativeMember = async (id: string) => {
    const batch = writeBatch(db);

    const memberDocRef = doc(membersCollectionRef, id);
    batch.delete(memberDocRef);

    const depositsQuery = query(depositsCollectionRef, where("memberId", "==", id));
    const depositsSnapshot = await getDocs(depositsQuery);
    depositsSnapshot.forEach(doc => batch.delete(doc.ref));

    const loansQuery = query(loansCollectionRef, where("memberId", "==", id));
    const loansSnapshot = await getDocs(loansQuery);
    loansSnapshot.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();
};

export const getCooperativeMember = async (id: string): Promise<CooperativeMember | null> => {
    const docRef = doc(membersCollectionRef, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            ...data,
            joinDate: (data.joinDate as Timestamp).toDate(),
            createdAt: (data.createdAt as Timestamp).toDate(),
            deposits: data.deposits || { kip: 0, thb: 0, usd: 0 },
        } as CooperativeMember;
    }
    return null;
};

export const listenToCooperativeDepositsForMember = (memberId: string, callback: (deposits: CooperativeDeposit[]) => void) => {
    const q = query(depositsCollectionRef, where("memberId", "==", memberId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const deposits: CooperativeDeposit[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            deposits.push({
                id: doc.id,
                ...data,
                date: (data.date as Timestamp).toDate(),
                 kip: data.kip || 0,
                thb: data.thb || 0,
                usd: data.usd || 0,
            } as CooperativeDeposit);
        });
        // Sort on the client-side
        deposits.sort((a, b) => b.date.getTime() - a.date.getTime());
        callback(deposits);
    });
    return unsubscribe;
}

export const getAllCooperativeMemberIds = async (): Promise<{ id: string }[]> => {
    const snapshot = await getDocs(membersCollectionRef);
    const ids = snapshot.docs.map(doc => ({ id: doc.id }));
     if (ids.length === 0) {
      return [{ id: 'default' }];
    }
    return ids;
};
