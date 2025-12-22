
import { db } from '@/lib/firebase';
import type { DebtorCreditorEntry } from '@/lib/types';
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

const collectionRef = collection(db, 'thai-student-debtorCreditorEntries');

export const listenToThaiStudentDebtorCreditorEntries = (callback: (items: DebtorCreditorEntry[]) => void) => {
    const q = query(collectionRef, orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const entries: DebtorCreditorEntry[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            entries.push({ 
                id: doc.id, 
                ...data,
                date: (data.date as Timestamp).toDate(),
                createdAt: (data.createdAt as Timestamp)?.toDate()
            } as DebtorCreditorEntry);
        });
        callback(entries);
    });
    return unsubscribe;
};

export const addThaiStudentDebtorCreditorEntry = async (entry: Omit<DebtorCreditorEntry, 'id' | 'createdAt'>) => {
    const entryWithTimestamp = {
        ...entry,
        date: Timestamp.fromDate(entry.date),
        createdAt: serverTimestamp()
    };
    await addDoc(collectionRef, entryWithTimestamp);
};

export const updateThaiStudentDebtorCreditorEntry = async (id: string, updatedFields: Partial<Omit<DebtorCreditorEntry, 'id' | 'createdAt'>>) => {
    const entryDoc = doc(db, 'thai-student-debtorCreditorEntries', id);
     if (updatedFields.date && updatedFields.date instanceof Date) {
        const { date, ...rest } = updatedFields;
        const newDate = startOfDay(date as Date);
        await updateDoc(entryDoc, { ...rest, date: Timestamp.fromDate(newDate) });
    } else {
        await updateDoc(entryDoc, updatedFields);
    }
};

export const deleteThaiStudentDebtorCreditorEntry = async (id: string) => {
    const entryDoc = doc(db, 'thai-student-debtorCreditorEntries', id);
    await deleteDoc(entryDoc);
};
