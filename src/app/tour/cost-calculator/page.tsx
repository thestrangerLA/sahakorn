
"use client"

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, isSameMonth, isSameYear } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Calculator, MoreHorizontal, Search, ArrowLeft, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import TourCalculatorClientPage from './[id]/client-page';
import type { SavedCalculation } from './[id]/client-page';
import { toDateSafe } from '@/lib/timestamp';


export default function TourCostCalculatorListPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = getFirestore(db.app);

    const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
    const [calculationsLoading, setCalculationsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

    useEffect(() => {
        if (!firestore) return;

        setCalculationsLoading(true);
        const calculationsColRef = collection(firestore, 'tourCalculations');
        const q = query(calculationsColRef, orderBy('savedAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const calcs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedCalculation));
            setSavedCalculations(calcs);
            setCalculationsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const availableMonths = useMemo(() => {
        const monthSet = new Set<string>();
        savedCalculations.forEach(calc => {
            const date = toDateSafe(calc.savedAt);
            if (date) {
                monthSet.add(format(date, 'yyyy-MM'));
            }
        });
        return Array.from(monthSet).sort((a,b) => b.localeCompare(a));
    }, [savedCalculations]);

    const filteredCalculations = useMemo(() => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const selectedDate = new Date(year, month - 1);
        
        return savedCalculations.filter(calc => {
            const savedAtDate = toDateSafe(calc.savedAt);
            const matchesMonth = savedAtDate && isSameMonth(savedAtDate, selectedDate) && isSameYear(savedAtDate, selectedDate);
            if (!matchesMonth) return false;

            const groupCode = calc.tourInfo?.groupCode?.toLowerCase() || '';
            const program = calc.tourInfo?.program?.toLowerCase() || '';
            const destination = calc.tourInfo?.destinationCountry?.toLowerCase() || '';
            return groupCode.includes(searchQuery.toLowerCase()) || 
                   program.includes(searchQuery.toLowerCase()) ||
                   destination.includes(searchQuery.toLowerCase());
        }).sort((a, b) => {
            const tourCodeA = a.tourInfo?.groupCode || '';
            const tourCodeB = b.tourInfo?.groupCode || '';
            return tourCodeB.localeCompare(tourCodeA);
        });
    }, [savedCalculations, searchQuery, selectedMonth]);

    const handleAddNewCalculation = async () => {
        if (!firestore) {
            toast({
                title: "Firestore not available",
                description: "Please try again later.",
                variant: "destructive"
            });
            return;
        }

        const newCalculationData = {
            savedAt: serverTimestamp(),
            tourInfo: {
                mouContact: '',
                groupCode: `LTH${format(new Date(),'yyyyMMddHHmmss')}`,
                destinationCountry: '',
                program: '',
                startDate: null,
                endDate: null,
                numDays: 1,
                numNights: 0,
                numPeople: 1,
                travelerInfo: ''
            },
            allCosts: {
                accommodations: [],
                trips: [],
                flights: [],
                trainTickets: [],
                entranceFees: [],
                meals: [],
                guides: [],
                documents: [],
                overseasPackages: [],
            },
        };
        const calculationsColRef = collection(firestore, 'tourCalculations');
        const newDocRef = await addDoc(calculationsColRef, newCalculationData);
        if(newDocRef){
          router.push(`/tour/cost-calculator/${newDocRef.id}`);
        }
    };
    
    const handleDeleteCalculation = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Prevent row click event
        if (!firestore) {
             toast({ title: "Error", description: "Firestore not available.", variant: "destructive" });
             return;
        }
        if (window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນການຄຳນວນນີ້?")) {
            const docRef = doc(firestore, 'tourCalculations', id);
            await deleteDoc(docRef);
            toast({
                title: "ລຶບຂໍ້ມູນສຳເລັດ",
                description: "ການຄຳນວນໄດ້ຖືກລຶບອອກແລ້ວ."
            });
        }
    };

    const handleRowClick = (id: string) => {
        router.push(`/tour/cost-calculator/${id}`);
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
             <header className="sticky top-0 z-30 flex h-20 items-center gap-4 bg-primary px-4 text-primary-foreground sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <Link href="/tour">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າຫຼັກ</span>
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Calculator className="h-6 w-6"/>
                        ລາຍການຄຳນວນຕົ້ນທຶນທັງໝົດ
                    </h1>
                </div>
                 <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="ຄົ້ນຫາ..."
                            className="pl-8 sm:w-[300px] text-black"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-[180px] text-black">
                            <SelectValue placeholder="ເລືອກເດືອນ" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMonths.map(month => (
                                <SelectItem key={month} value={month}>
                                    {format(new Date(month + '-02'), 'LLLL yyyy')}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddNewCalculation}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        ເພີ່ມການຄຳນວນໃໝ່
                    </Button>
                </div>
            </header>
            <main className="flex w-full flex-1 flex-col gap-8 p-4 sm:px-6 sm:py-4">
                <div className="w-full max-w-screen-2xl mx-auto flex flex-col gap-4">
                     {calculationsLoading ? (
                        <Card>
                            <CardContent className="p-10 text-center text-muted-foreground">
                                <p>Loading calculations...</p>
                            </CardContent>
                        </Card>
                     ) : (
                        <Card>
                             <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>ວັນທີບັນທຶກ</TableHead>
                                                <TableHead>Group Code</TableHead>
                                                <TableHead>ໂປຣແກຣມ</TableHead>
                                                <TableHead>ຈຸດໝາຍ</TableHead>
                                                <TableHead>ຈຳນວນຄົນ</TableHead>
                                                <TableHead className="text-right">ການກະທຳ</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCalculations.length > 0 ? filteredCalculations.map(calc => {
                                                const savedAtDate = toDateSafe(calc.savedAt);
                                                return (
                                                <TableRow key={calc.id} className="cursor-pointer hover:bg-muted/30" onClick={() => handleRowClick(calc.id)}>
                                                    
                                                    <TableCell>{savedAtDate ? format(savedAtDate, 'dd/MM/yyyy') : '...'}</TableCell>
                                                    <TableCell>{calc.tourInfo?.groupCode}</TableCell>
                                                    <TableCell>{calc.tourInfo?.program}</TableCell>
                                                    <TableCell>{calc.tourInfo?.destinationCountry}</TableCell>
                                                    <TableCell>{calc.tourInfo?.numPeople}</TableCell>
                                                    <TableCell className="text-right">
                                                         <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button aria-haspopup="true" size="icon" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                    <span className="sr-only">Toggle menu</span>
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                                <DropdownMenuItem onSelect={() => navigateToCalculation(calc.id)}>Edit in Full Page</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={(e) => handleDeleteCalculation(e, calc.id)} className="text-red-500">Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                                );
                                            }) : (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="h-24 text-center">
                                                        ບໍ່ພົບຂໍ້ມູນ.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </main>
        </div>
    );
}

    