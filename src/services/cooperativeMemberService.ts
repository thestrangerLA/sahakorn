
import { db } from '@/lib/firebase';
import type { CooperativeMember } from '@/lib/types';
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
    Timestamp
} from 'firebase/firestore';
import { startOfDay } from 'date-fns';

const collectionRef = collection(db, 'cooperativeMembers');

export const listenToCooperativeMembers = (callback: (items: CooperativeMember[]) => void) => {
    const q = query(collectionRef, orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const members: CooperativeMember[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            members.push({ 
                id: doc.id, 
                ...data,
                joinDate: (data.joinDate as Timestamp).toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate()
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
        createdAt: serverTimestamp()
    };
    await addDoc(collectionRef, memberWithTimestamp);
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
    const memberDoc = doc(db, 'cooperativeMembers', id);
    await deleteDoc(memberDoc);
};
