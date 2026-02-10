"use client"

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, Save, Trash2, MapPin, Calendar as CalendarIcon, BedDouble, Truck, Plane, TrainFront, PlusCircle, Camera, UtensilsCrossed, Users, FileText, Clock, Eye, EyeOff, Printer, Earth, Ticket } from "lucide-react";
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { TotalCostCard } from '@/components/tour/TotalCostCard';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ExchangeRateCard, ExchangeRates } from '@/components/tour/ExchangeRateCard';
import { doc, setDoc, serverTimestamp, Timestamp, deleteDoc, getFirestore, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toDateSafe } from '@/lib/timestamp';
import { useDebouncedCallback } from 'use-debounce';

// Types
type Currency = 'USD' | 'THB' | 'LAK' | 'CNY';

const currencySymbols: Record<Currency, string> = {
    USD: '$ (ດอลลár)',
    THB: '฿ (ບາດ)',
    LAK: '₭ (ກີບ)',
    CNY: '¥ (ຢວນ)',
};

const formatNumber = (num: number, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat('en-US', options).format(num);

type DateValue = Date | string | undefined | null;

// --- Component Prop Types ---
type Accommodation = { id: string; name: string; type: 'hotel' | 'guesthouse'; checkInDate?: DateValue; rooms: Room[]; };
type Room = { id: string; type: string; numRooms: number; numNights: number; price: number; currency: Currency; };
type Trip = { id: string; location: string; route: string; vehicleType: string; numVehicles: number; numDays: number; pricePerVehicle: number; currency: Currency; };
type Flight = { id: string; from: string; to: string; departureDate?: DateValue; departureTime: string; pricePerPerson: number; numPeople: number; currency: Currency; };
type TrainTicket = { id: string; from: string; to: string; departureDate?: DateValue; departureTime: string; ticketClass: string; numTickets: number; pricePerTicket: number; currency: Currency; };
type EntranceFee = { id: string; locationName: string; pax: number; numLocations: number; price: number; currency: Currency; };
type MealCost = { id: string; name: string; pax: number; breakfast: number; lunch: number; dinner: number; pricePerMeal: number; currency: Currency; };
type GuideFee = { id: string; guideName: string; numGuides: number; numDays: number; pricePerDay: number; currency: Currency; };
type DocumentFee = { id: string; documentName: string; pax: number; price: number; currency: Currency; };
type OverseasPackage = { id: string; name: string; priceUSD: number; priceTHB: number; priceCNY: number; };
type ActivityCost = { id: string; name: string; pax: number; price: number; currency: Currency; };

interface TourInfo {
    mouContact: string;
    groupCode: string;
    destinationCountry: string;
    program: string;
    startDate?: DateValue;
    endDate?: DateValue;
    numDays: number;
    numNights: number;
    numPeople: number;
    travelerInfo: string;
}

interface TourCosts {
    accommodations: Accommodation[];
    trips: Trip[];
    flights: Flight[];
    trainTickets: TrainTicket[];
    entranceFees: EntranceFee[];
    meals: MealCost[];
    guides: GuideFee[];
    documents: DocumentFee[];
    overseasPackages: OverseasPackage[];
    activities: ActivityCost[];
}

export interface SavedCalculation {
    id: string;
    savedAt: DateValue;
    tourInfo: TourInfo;
    allCosts: TourCosts;
    exchangeRates?: ExchangeRates;
    profitPercentage?: number;
}

const initialRates: ExchangeRates = {
    USD: { THB: 38, LAK: 25000, CNY: 8 },
    THB: { USD: 0.032, LAK: 700, CNY: 0.25 },
    CNY: { USD: 0.20, THB: 6, LAK: 3500 },
    LAK: { USD: 0.00005, THB: 0.0015, CNY: 0.00035 },
};

const CostCategoryContent = ({ title, icon, children, summary }: { title: string, icon: React.ReactNode, children: React.ReactNode, summary: React.ReactNode }) => (
     <AccordionItem value={title.toLowerCase().replace(/\s/g, '-')} className="bg-card p-4 rounded-lg">
        <AccordionTrigger className="text-lg font-semibold p-0 hover:no-underline">
          <div className="flex items-center gap-3">
            {icon} {title}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4">
            {children}
            {summary}
        </AccordionContent>
    </AccordionItem>
);


export default function TourCalculatorClientPage({ initialCalculation }: { initialCalculation: SavedCalculation | null}) {
    const { toast } = useToast();
    const router = useRouter();
    const params = useParams();
    const calculationId = params.id as string;
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);
    
    const [tourInfo, setTourInfo] = useState<TourInfo>(initialCalculation?.tourInfo || {
        mouContact: '', groupCode: '', destinationCountry: '', program: '',
        numDays: 1, numNights: 0, numPeople: 1, travelerInfo: ''
    });

    const [allCosts, setAllCosts] = useState<TourCosts>(initialCalculation?.allCosts || {
        accommodations: [], trips: [], flights: [], trainTickets: [],
        entranceFees: [], meals: [], guides: [], documents: [], overseasPackages: [], activities: []
    });

    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(initialCalculation?.exchangeRates || initialRates);
    const [profitPercentage, setProfitPercentage] = useState<number>(initialCalculation?.profitPercentage || 20);
    
    const [itemVisibility, setItemVisibility] = useState<Record<string, boolean>>({});

    const [loading, setLoading] = useState(!initialCalculation);
    const [error, setError] = useState<string | null>(null);
    const [isSavingRates, setIsSavingRates] = useState(false);

    const debouncedSaveRates = useDebouncedCallback(async (rates: ExchangeRates) => {
        if (!calculationId || loading) return;
        setIsSavingRates(true);
        try {
            const firestore = getFirestore(db.app);
            const calculationDocRef = doc(firestore, 'tourCalculations', calculationId);
            await setDoc(calculationDocRef, { exchangeRates: rates }, { merge: true });
            toast({ title: "ບັນທຶກອັດຕາແລກປ່ຽນສຳເລັດ" });
        } catch (error) {
            console.error("Failed to save exchange rates:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ", variant: "destructive" });
        } finally {
            setIsSavingRates(false);
        }
    }, 1500);

    const handleRatesChange = (newRates: ExchangeRates) => {
        setExchangeRates(newRates);
        debouncedSaveRates(newRates);
    };

    useEffect(() => {
        if (!isClient || !calculationId || calculationId === 'default') {
            setLoading(false);
            return;
        };

        const firestore = getFirestore(db.app);
        const docRef = doc(firestore, 'tourCalculations', calculationId);

        const unsubscribe = onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as SavedCalculation;
                setTourInfo(data.tourInfo || {
                    mouContact: '', groupCode: '', destinationCountry: '', program: '',
                    numDays: 1, numNights: 0, numPeople: 1, travelerInfo: ''
                });
                setAllCosts(data.allCosts || {
                    accommodations: [], trips: [], flights: [], trainTickets: [],
                    entranceFees: [], meals: [], guides: [], documents: [], overseasPackages: [], activities: []
                });
                if (data.exchangeRates) setExchangeRates(data.exchangeRates);
                if (data.profitPercentage !== undefined) setProfitPercentage(data.profitPercentage);
                setLoading(false);
            } else {
                setError("Calculation not found.");
                setLoading(false);
            }
        }, (err) => {
            console.error("Error listening to document:", err);
            setError("Failed to load calculation data.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [calculationId, isClient]);
    
    const deepCopyAndConvertDates = (obj: any) => {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Date) {
            return Timestamp.fromDate(obj);
        }
        
        if (Array.isArray(obj)) {
            return obj.map(deepCopyAndConvertDates);
        }

        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                newObj[key] = deepCopyAndConvertDates(obj[key]);
            }
        }
        return newObj;
    };
    
    const handleDataChange = useCallback(async () => {
        if (!calculationId || loading) return;
        
        const firestore = getFirestore(db.app);
        const calculationDocRef = doc(firestore, 'tourCalculations', calculationId);

        const dataToSave: Partial<SavedCalculation> = {
            tourInfo: deepCopyAndConvertDates(tourInfo),
            allCosts: deepCopyAndConvertDates(allCosts),
            exchangeRates: exchangeRates,
            profitPercentage: profitPercentage,
            savedAt: serverTimestamp(),
        };

        try {
            await setDoc(calculationDocRef, dataToSave, { merge: true });
        } catch (e) {
            console.error("Error saving document: ", e);
            throw e; // Re-throw to be caught by the caller
        }

    }, [calculationId, tourInfo, allCosts, loading, exchangeRates, profitPercentage]);

    const toggleItemVisibility = (itemId: string) => {
        setItemVisibility(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    const updateCosts = useCallback((category: keyof TourCosts, data: any[]) => {
        setAllCosts(prev => ({ ...prev, [category]: data }));
    }, []);
    
    const handleSaveCalculation = async () => {
        try {
            await handleDataChange();
            toast({
                title: "ບັນທຶກການຄຳນວນສຳເລັດ",
                description: `ຂໍ້ມູນ ${tourInfo.groupCode || 'ບໍ່ມີຊື່'} ໄດ້ຖືກບັນທຶກແລ້ວ.`,
            });
        } catch (e) {
            toast({
                title: "Error Saving",
                description: "Could not save the calculation.",
                variant: "destructive"
            });
        }
    };
    
    const handleDeleteCalculation = async () => {
        if (window.confirm("ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນການຄຳນວນນີ້?")) {
            const firestore = getFirestore(db.app);
            const calculationDocRef = doc(firestore, 'tourCalculations', calculationId);
            await deleteDoc(calculationDocRef);
            router.push('/tour/cost-calculator');
        }
    };

    // Generic CRUD operations
    const addItem = <T extends keyof TourCosts>(category: T, newItem: any) => {
        const currentItems = allCosts[category] as any[] || [];
        updateCosts(category, [...currentItems, newItem]);
    };

    const updateItem = <T extends keyof TourCosts>(category: T, itemId: string, field: string, value: any) => {
        const currentItems = allCosts[category] as any[];
        const updatedItems = currentItems.map(item => item.id === itemId ? { ...item, [field]: value } : item);
        updateCosts(category, updatedItems as TourCosts[T]);
    };
    
    const deleteItem = <T extends keyof TourCosts>(category: T, itemId: string) => {
        const updatedItems = (allCosts[category] || []).filter((item: any) => item.id !== itemId);
        updateCosts(category, updatedItems as TourCosts[T]);
         toast({
            title: "ລຶບລາຍການສຳເລັດ",
            variant: "destructive"
        });
    };
    
    // Specific Component Logic
    const addAccommodation = () => addItem('accommodations', { id: uuidv4(), name: '', type: 'hotel', rooms: [{ id: uuidv4(), type: 'เตียงเดี่ยว', numRooms: 1, numNights: 1, price: 0, currency: 'USD' }] });
    const addRoom = (accId: string) => {
        const accommodations = allCosts.accommodations.map(acc => {
            if (acc.id === accId) {
                const newRoom = { id: uuidv4(), type: 'เตียงเดี่ยว', numRooms: 1, numNights: 1, price: 0, currency: 'USD' };
                return { ...acc, rooms: [...acc.rooms, newRoom] };
            }
            return acc;
        });
        updateCosts('accommodations', accommodations);
    };
    const updateRoom = (accId: string, roomId: string, field: keyof Room, value: any) => {
         const accommodations = allCosts.accommodations.map(acc => {
            if (acc.id === accId) {
                const updatedRooms = acc.rooms.map(room => room.id === roomId ? { ...room, [field]: value } : room);
                return { ...acc, rooms: updatedRooms };
            }
            return acc;
        });
        updateCosts('accommodations', accommodations);
    };
    const deleteRoom = (accId: string, roomId: string) => {
         const accommodations = allCosts.accommodations.map(acc => {
            if (acc.id === accId) {
                return { ...acc, rooms: acc.rooms.filter(room => room.id !== roomId) };
            }
            return acc;
        });
        updateCosts('accommodations', accommodations);
    };

    const addTrip = () => addItem('trips', { id: uuidv4(), location: '', route: '', vehicleType: 'ລົດຕູ້ທຳມະດາ', numVehicles: 1, numDays: 1, pricePerVehicle: 0, currency: 'USD' });
    const addFlight = () => addItem('flights', { id: uuidv4(), from: '', to: '', departureTime: '08:00', pricePerPerson: 0, numPeople: 1, currency: 'USD' });
    const addTrainTicket = () => addItem('trainTickets', { id: uuidv4(), from: '', to: '', departureTime: '08:00', ticketClass: '', numTickets: 1, pricePerTicket: 0, currency: 'LAK' });
    const addEntranceFee = () => addItem('entranceFees', { id: uuidv4(), locationName: '', pax: 1, numLocations: 1, price: 0, currency: 'LAK' });
    const addMealCost = () => addItem('meals', { id: uuidv4(), name: '', pax: 1, breakfast: 0, lunch: 0, dinner: 0, pricePerMeal: 0, currency: 'LAK' });
    const addGuideFee = () => addItem('guides', { id: uuidv4(), guideName: '', numGuides: 1, numDays: 1, pricePerDay: 0, currency: 'LAK' });
    const addDocumentFee = () => addItem('documents', { id: uuidv4(), documentName: '', pax: 1, price: 0, currency: 'LAK' });
    const addOverseasPackage = () => addItem('overseasPackages', { id: uuidv4(), name: '', priceUSD: 0, priceTHB: 0, priceCNY: 0 });
    const addActivity = () => addItem('activities', { id: uuidv4(), name: '', pax: 1, price: 0, currency: 'LAK' });

    // --- Total Calculation Memos ---
    const accommodationTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.accommodations?.forEach(acc => {
            acc.rooms.forEach(room => {
                totals[room.currency] += (room.numRooms || 0) * (room.numNights || 0) * (room.price || 0);
            });
        });
        return totals;
    }, [allCosts.accommodations]);

    const tripTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.trips?.forEach(trip => {
            totals[trip.currency] += (trip.numVehicles || 0) * (trip.numDays || 0) * (trip.pricePerVehicle || 0);
        });
        return totals;
    }, [allCosts.trips]);

    const flightTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.flights?.forEach(flight => {
            totals[flight.currency] += (flight.pricePerPerson || 0) * (flight.numPeople || 0);
        });
        return totals;
    }, [allCosts.flights]);
    
    const trainTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.trainTickets?.forEach(ticket => {
            totals[ticket.currency] += (ticket.pricePerTicket || 0) * (ticket.numTickets || 0);
        });
        return totals;
    }, [allCosts.trainTickets]);

    const entranceFeeTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.entranceFees?.forEach(fee => {
            totals[fee.currency] += (fee.pax || 0) * (fee.numLocations || 0) * (fee.price || 0);
        });
        return totals;
    }, [allCosts.entranceFees]);

    const mealTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.meals?.forEach(meal => {
            totals[meal.currency] += ((meal.breakfast || 0) + (meal.lunch || 0) + (meal.dinner || 0)) * (meal.pricePerMeal || 0) * (meal.pax || 0);
        });
        return totals;
    }, [allCosts.meals]);

    const guideTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.guides?.forEach(guide => {
            totals[guide.currency] += (guide.numGuides || 0) * (guide.numDays || 0) * (guide.pricePerDay || 0);
        });
        return totals;
    }, [allCosts.guides]);

    const documentTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.documents?.forEach(doc => {
            totals[doc.currency] += (doc.pax || 0) * (doc.price || 0);
        });
        return totals;
    }, [allCosts.documents]);

    const overseasPackageTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.overseasPackages?.forEach(pkg => {
            totals.USD += pkg.priceUSD || 0;
            totals.THB += pkg.priceTHB || 0;
            totals.CNY += pkg.priceCNY || 0;
        });
        return totals;
    }, [allCosts.overseasPackages]);
    
    const activityTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        allCosts.activities?.forEach(activity => {
            totals[activity.currency] += (activity.pax || 0) * (activity.price || 0);
        });
        return totals;
    }, [allCosts.activities]);

    const totalsByCategory = {
        'ຄ່າທີ່ພັກ': accommodationTotals,
        'ຄ່າຂົນສົ່ງ': tripTotals,
        'ຄ່າປີ້ຍົນ': flightTotals,
        'ຄ່າປີ້ລົດໄຟ': trainTotals,
        'ຄ່າເຂົ້າຊົມສະຖານທີ່': entranceFeeTotals,
        'ຄ່າອາຫານ': mealTotals,
        'ຄ່າໄກ້': guideTotals,
        'ຄ່າເອກະສານ': documentTotals,
        'ຄ່າເພັກເກດຕ່າງປະເທດ': overseasPackageTotals,
        'ຄ່າກິດຈະກຳ': activityTotals,
    };

    const grandTotals = useMemo(() => {
        const totals: Record<Currency, number> = { USD: 0, THB: 0, LAK: 0, CNY: 0 };
        Object.values(totalsByCategory).forEach(categoryTotals => {
            (Object.keys(totals) as Currency[]).forEach(currency => {
                totals[currency] += categoryTotals[currency];
            });
        });
        return totals;
    }, [totalsByCategory]);
    
    const handlePrint = () => {
        window.print();
    };

    const CategorySummary = ({ totals }: { totals: Record<Currency, number> }) => {
        const filteredTotals = Object.entries(totals).filter(([, value]) => value > 0);
        if (filteredTotals.length === 0) return null;

        return (
            <div className="mt-4 rounded-lg bg-primary/10 p-3">
                <p className="font-semibold text-primary mb-2">ສະຫຼຸບຍອດ:</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {filteredTotals.map(([currency, value]) => (
                        <span key={currency} className="text-sm font-medium">{`${currencySymbols[currency as Currency].split(' ')[0]} ${formatNumber(value)}`}</span>
                    ))}
                </div>
            </div>
        );
    };

    if (loading || !isClient) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <p className="text-2xl font-semibold mb-4">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
           <div className="flex items-center justify-center h-screen">
               <p>{error}</p>
           </div>
        );
   }
   
    const startDate = toDateSafe(tourInfo.startDate);
    const endDate = toDateSafe(tourInfo.endDate);

    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 z-30 flex h-20 items-center gap-4 bg-primary px-4 text-primary-foreground sm:px-6 print:hidden">
                <Button variant="outline" size="icon" className="h-8 w-8 bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10" asChild>
                    <Link href="/tour/cost-calculator">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">ກັບໄປໜ້າລາຍການ</span>
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl font-bold tracking-tight">ລະບົບຈອງທົວ ແລະ ຄຳນວນຄ່າໃຊ້ຈ່າຍ</h1>
                    <p className="text-sm text-primary-foreground/80">ຈັດການຂໍ້ມູນທົວ ແລະ ຄຳນວນຄ່າໃຊ້ຈ່າຍແບບຄົບວົງຈອນ</p>
                </div>
                 <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10" onClick={handleSaveCalculation}>
                        <Save className="mr-2 h-4 w-4" />
                        ບັນທຶກຂໍ້ມູນ
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteCalculation}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        ລຶບ
                    </Button>
                    <Button variant="outline" className="bg-transparent text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        ພິມ
                    </Button>
                </div>
            </header>
            <main className="flex w-full flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 bg-background print:p-0 print:bg-white print:gap-2">
                <div className="w-full max-w-screen-xl mx-auto flex flex-col gap-4">
                    
                    <div id="print-content" className="print-container">
                         <div className="hidden print:block print:space-y-2">
                            <h1 className="print:text-lg print:font-bold text-center">ຂໍ້ມູນທົວ</h1>
                            <div className="grid grid-cols-2 gap-x-4 print:text-xs print:border-y print:py-1">
                                <div className="space-y-0.5">
                                    <div className="flex justify-between"><strong className="font-semibold">MOU Contact:</strong><span>{tourInfo.mouContact}</span></div>
                                    <div className="flex justify-between"><strong className="font-semibold">Group Code:</strong><span>{tourInfo.groupCode}</span></div>
                                    <div className="flex justify-between"><strong className="font-semibold">Destination:</strong><span>{tourInfo.destinationCountry}</span></div>
                                    <div className="flex justify-between"><strong className="font-semibold">Program:</strong><span>{tourInfo.program}</span></div>
                                </div>
                                <div className="space-y-0.5">
                                    <div className="flex justify-between">
                                        <strong className="font-semibold">Travel Dates:</strong>
                                        <span>
                                            {startDate ? format(startDate, "dd/MM/yy") : ''}
                                            {endDate ? ` - ${format(endDate, "dd/MM/yy")}` : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between"><strong className="font-semibold">Duration:</strong><span>{tourInfo.numDays} Days, {tourInfo.numNights} Nights</span></div>
                                    <div className="flex justify-between"><strong className="font-semibold">Pax:</strong><span>{tourInfo.numPeople}</span></div>
                                    <div className="flex justify-between"><strong className="font-semibold">Traveler Info:</strong><span>{tourInfo.travelerInfo}</span></div>
                                </div>
                            </div>
                        </div>

                         <div className="print:hidden">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <MapPin className="h-6 w-6 text-primary" />
                                        ຂໍ້ມູນທົວ
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="mou-contact">MOU Contact:</Label>
                                        <Input id="mou-contact" placeholder="ຊື່ຜູ້ຕິດຕໍ່" value={tourInfo.mouContact} onChange={e => setTourInfo({...tourInfo, mouContact: e.target.value})} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="group-code">Group Code:</Label>
                                        <Input id="group-code" placeholder="ລະຫັດກຸ່ມ" value={tourInfo.groupCode} onChange={e => setTourInfo({...tourInfo, groupCode: e.target.value})} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="destination-country">ປະເທດປາຍທາງ:</Label>
                                        <Input id="destination-country" placeholder="ປະເທດປາຍທາງ" value={tourInfo.destinationCountry} onChange={e => setTourInfo({...tourInfo, destinationCountry: e.target.value})} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="program">ໂປຣແກຣມ:</Label>
                                        <Input id="program" placeholder="ລະບຸໂປຣແກຣມ" value={tourInfo.program} onChange={e => setTourInfo({...tourInfo, program: e.target.value})} />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                         <div className="grid gap-2">
                                            <Label htmlFor="travel-date-start">ວັນທີເດີນທາງ:</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className="justify-start text-left font-normal bg-input">
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {startDate ? format(startDate, "dd/MM/yyyy") : <span>mm/dd/yyyy</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar mode="single" selected={startDate} onSelect={date => setTourInfo({...tourInfo, startDate: date?.toISOString()})} initialFocus locale={th} />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                         <div className="grid gap-2 items-end">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className="justify-start text-left font-normal bg-input">
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {endDate ? format(endDate, "dd/MM/yyyy") : <span>mm/dd/yyyy</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar mode="single" selected={endDate} onSelect={date => setTourInfo({...tourInfo, endDate: date?.toISOString()})} initialFocus locale={th} />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="num-days">ຈຳນວນວັນ:</Label>
                                            <Input id="num-days" type="number" placeholder="1" value={tourInfo.numDays} onChange={e => setTourInfo({...tourInfo, numDays: Number(e.target.value) || 1})} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="num-nights">ຈຳນວນຄືນ:</Label>
                                            <Input id="num-nights" type="number" placeholder="0" value={tourInfo.numNights} onChange={e => setTourInfo({...tourInfo, numNights: Number(e.target.value) || 0})} />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="num-people">ຈຳນວນຄົນ:</Label>
                                        <Input id="num-people" type="number" placeholder="1" value={tourInfo.numPeople} onChange={e => setTourInfo({...tourInfo, numPeople: Number(e.target.value) || 1})} />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="traveler-info">ຂໍ້ມູນຜູ້ຮ່ວມເດີນທາງ:</Label>
                                        <Textarea id="traveler-info" placeholder="ຕົວຢ່າງ ກຸ່ມຄອບຄົວ, ຄູ່ຮັກ, ຜູ້ສູງອາຍຸ" className="min-h-[40px]" value={tourInfo.travelerInfo} onChange={e => setTourInfo({...tourInfo, travelerInfo: e.target.value})} />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        <Card className="print:hidden">
                            <CardHeader>
                                <CardTitle>ຄຳນວນຄ່າໃຊ້ຈ່າຍ</CardTitle>
                                <CardDescription>ເພີ່ມ ແລະ ຈັດການຄ່າໃຊ້ຈ່າຍຕ່າງໆ</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="multiple" className="w-full flex flex-col gap-4" defaultValue={['ຄ່າທີ່ພັກ', 'ຄ່າຂົນສົ່ງ', 'ຄ່າປີ້ຍົນ', 'ຄ່າປີ້ລົດໄຟ', 'ຄ່າເຂົ້າຊົມສະຖານທີ່', 'ຄ່າອາຫານ', 'ຄ່າໄກ້', 'ຄ່າເອກະສານ', 'ຄ່າເພັກເກດຕ່າງປະເທດ', 'ຄ່າກິດຈະກຳ'].map(t => t.toLowerCase().replace(/\s/g, '-'))}>
                                    {/* Accommodation */}
                                    <CostCategoryContent 
                                        title="ຄ່າທີ່ພັກ" 
                                        icon={<BedDouble className="h-5 w-5" />}
                                        summary={<CategorySummary totals={accommodationTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.accommodations?.map((acc, index) => (
                                                <Card key={acc.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ທີ່ພັກ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(acc.id)}>
                                                                {itemVisibility[acc.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('accommodations', acc.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                {(itemVisibility[acc.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        {/* Acc Fields */}
                                                            <div className="grid md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ຊື່ທີ່ພັກ</Label>
                                                                <Input placeholder="ຊື່ທີ່ພັກ" value={acc.name} onChange={e => updateItem('accommodations', acc.id, 'name', e.target.value)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ວັນທີເຊັກອິນ</Label>
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                                            {acc.checkInDate && toDateSafe(acc.checkInDate) ? format(toDateSafe(acc.checkInDate)!, "dd/MM/yyyy") : <span>mm/dd/yyyy</span>}
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0">
                                                                        <Calendar mode="single" selected={toDateSafe(acc.checkInDate)} onSelect={(date) => updateItem('accommodations', acc.id, 'checkInDate', date?.toISOString())} initialFocus />
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </div>
                                                            </div>
                                                        {/* Rooms */}
                                                        {acc.rooms.map((room, roomIndex) => (
                                                            <div key={room.id} className="p-3 border rounded-md relative bg-background">
                                                                <Label className="absolute -top-2 left-2 bg-background px-1 text-xs text-muted-foreground">ຫ້ອງ #{roomIndex+1}</Label>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div className="space-y-1">
                                                                        <Label className="text-xs">ປະເພດ</Label>
                                                                        <Select value={room.type} onValueChange={(v) => updateRoom(acc.id, room.id, 'type', v)}>
                                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="เตียงเดี่ยว">ຕຽງດ່ຽວ</SelectItem>
                                                                                <SelectItem value="เตียงคู่">ຕຽງຄູ່</SelectItem>
                                                                                <SelectItem value="ห้องสวีท">ຫ້ອງສະວີດ</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                        <div className="space-y-1">
                                                                        <Label className="text-xs">ຈຳນວນຫ້ອງ</Label>
                                                                        <Input type="number" min="1" value={room.numRooms} onChange={e => updateRoom(acc.id, room.id, 'numRooms', parseInt(e.target.value) || 1)} className="h-8" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-xs">ຈຳນວນຄືນ</Label>
                                                                        <Input type="number" min="1" value={room.numNights} onChange={e => updateRoom(acc.id, room.id, 'numNights', parseInt(e.target.value) || 1)} className="h-8" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-xs">ລາຄາ/ຫ້ອງ/ຄືນ</Label>
                                                                        <Input type="number" min="0" value={room.price} onChange={e => updateRoom(acc.id, room.id, 'price', parseFloat(e.target.value) || 0)} className="h-8" />
                                                                    </div>
                                                                    <div className="space-y-1 col-span-2">
                                                                        <Label className="text-xs">ສະກຸນເງິນ</Label>
                                                                        <Select value={room.currency} onValueChange={(v) => updateRoom(acc.id, room.id, 'currency', v)}>
                                                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                                            <SelectContent>
                                                                                {(Object.keys(currencySymbols) as Currency[]).map(c => (
                                                                                    <SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                                {acc.rooms.length > 1 && <Button variant="ghost" size="icon" className="absolute top-0 right-0 h-6 w-6" onClick={() => deleteRoom(acc.id, room.id)}><Trash2 className="h-3 w-3 text-red-400"/></Button>}
                                                            </div>
                                                        ))}
                                                        <Button size="sm" variant="outline" onClick={() => addRoom(acc.id)}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຫ້ອງ</Button>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addAccommodation}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າທີ່ພັກ</Button>
                                        </div>
                                    </CostCategoryContent>
                                    
                                    {/* Transport */}
                                    <CostCategoryContent 
                                        title="ຄ່າຂົນສົ່ງ" 
                                        icon={<Truck className="h-5 w-5" />}
                                        summary={<CategorySummary totals={tripTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.trips?.map((trip, index) => (
                                                <Card key={trip.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ການເດີນທາງ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(trip.id)}>
                                                                {itemVisibility[trip.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('trips', trip.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[trip.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ສະຖານທີ່</Label>
                                                                <Input placeholder="ສະຖານທີ່" value={trip.location} onChange={e => updateItem('trips', trip.id, 'location', e.target.value)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ເສັ້ນທາງ</Label>
                                                                <Input placeholder="ວຽງຈັນ - ວັງວຽງ" value={trip.route} onChange={e => updateItem('trips', trip.id, 'route', e.target.value)} />
                                                            </div>
                                                            <div className="col-span-2 space-y-2">
                                                                <Label>ປະເພດລົດ</Label>
                                                                <Input placeholder="ລົດຕູ້ທຳມະດາ" value={trip.vehicleType} onChange={e => updateItem('trips', trip.id, 'vehicleType', e.target.value)} />
                                                            </div>
                                                        </div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ຈຳນວນຄັນ</Label>
                                                                <Input type="number" min="1" value={trip.numVehicles} onChange={e => updateItem('trips', trip.id, 'numVehicles', parseInt(e.target.value) || 1)} className="h-8"/>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ຈຳນວນວັນ</Label>
                                                                <Input type="number" min="1" value={trip.numDays} onChange={e => updateItem('trips', trip.id, 'numDays', parseInt(e.target.value) || 1)} className="h-8"/>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ລາຄາ/ຄັນ</Label>
                                                                <Input type="number" min="0" value={trip.pricePerVehicle} onChange={e => updateItem('trips', trip.id, 'pricePerVehicle', parseFloat(e.target.value) || 0)} className="h-8"/>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ສະກຸນເງິນ</Label>
                                                                <Select value={trip.currency} onValueChange={(v) => updateItem('trips', trip.id, 'currency', v)}>
                                                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addTrip}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າຂົນສົ່ງ</Button>
                                        </div>
                                    </CostCategoryContent>
                                    {/* Flights */}
                                    <CostCategoryContent 
                                        title="ຄ່າປີ້ຍົນ" 
                                        icon={<Plane className="h-5 w-5" />}
                                        summary={<CategorySummary totals={flightTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.flights?.map((flight, index) => (
                                                <Card key={flight.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ປີ້ຍົນ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(flight.id)}>
                                                                {itemVisibility[flight.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('flights', flight.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[flight.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ເສັ້ນທາງ</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Input placeholder="ຈາກ" value={flight.from} onChange={e => updateItem('flights', flight.id, 'from', e.target.value)} />
                                                                    <span>ໄປ</span>
                                                                    <Input placeholder="ໄປ" value={flight.to} onChange={e => updateItem('flights', flight.id, 'to', e.target.value)} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ວັນ-ເວລາເດີນທາງ</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button variant={"outline"} className="w-[180px] justify-start text-left font-normal">
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                {flight.departureDate && toDateSafe(flight.departureDate) ? format(toDateSafe(flight.departureDate)!, "dd/MM/yyyy") : <span>mm/dd/yyyy</span>}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0">
                                                                            <Calendar mode="single" selected={toDateSafe(flight.departureDate)} onSelect={(date) => updateItem('flights', flight.id, 'departureDate', date?.toISOString())} initialFocus />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <div className="relative">
                                                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                        <Input type="time" value={flight.departureTime} onChange={e => updateItem('flights', flight.id, 'departureTime', e.target.value)} className="pl-10" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                            <div className="grid grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ/ຄົນ</Label>
                                                                <Input type="number" min="0" value={flight.pricePerPerson} onChange={e => updateItem('flights', flight.id, 'pricePerPerson', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ຈຳນວນຄົນ</Label>
                                                                <Input type="number" min="1" value={flight.numPeople} onChange={e => updateItem('flights', flight.id, 'numPeople', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={flight.currency} onValueChange={(v) => updateItem('flights', flight.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addFlight}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າປີ້ຍົນ</Button>
                                        </div>
                                    </CostCategoryContent>
                                    {/* Train Tickets */}
                                    <CostCategoryContent 
                                        title="ຄ່າປີ້ລົດໄຟ" 
                                        icon={<TrainFront className="h-5 w-5" />}
                                        summary={<CategorySummary totals={trainTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.trainTickets?.map((ticket, index) => (
                                                <Card key={ticket.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ປີ້ລົດໄຟ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(ticket.id)}>
                                                                {itemVisibility[ticket.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('trainTickets', ticket.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[ticket.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ເສັ້ນທາງ</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Input placeholder="ຈາກ" value={ticket.from} onChange={e => updateItem('trainTickets', ticket.id, 'from', e.target.value)} />
                                                                    <span>ໄປ</span>
                                                                    <Input placeholder="ໄປ" value={ticket.to} onChange={e => updateItem('trainTickets', ticket.id, 'to', e.target.value)} />
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ວັນ-ເວລາເດີນທາງ</Label>
                                                                <div className="flex items-center gap-2">
                                                                    <Popover>
                                                                        <PopoverTrigger asChild>
                                                                            <Button variant={"outline"} className="w-[180px] justify-start text-left font-normal">
                                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                                 {ticket.departureDate && toDateSafe(ticket.departureDate) ? format(toDateSafe(ticket.departureDate)!, "dd/MM/yyyy") : <span>mm/dd/yyyy</span>}
                                                                            </Button>
                                                                        </PopoverTrigger>
                                                                        <PopoverContent className="w-auto p-0">
                                                                            <Calendar mode="single" selected={toDateSafe(ticket.departureDate)} onSelect={(date) => updateItem('trainTickets', ticket.id, 'departureDate', date?.toISOString())} initialFocus />
                                                                        </PopoverContent>
                                                                    </Popover>
                                                                    <div className="relative">
                                                                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                        <Input type="time" value={ticket.departureTime} onChange={e => updateItem('trainTickets', ticket.id, 'departureTime', e.target.value)} className="pl-10" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ/ປີ້</Label>
                                                                <Input type="number" min="0" value={ticket.pricePerTicket} onChange={e => updateItem('trainTickets', ticket.id, 'pricePerTicket', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ຈຳນວນປີ້</Label>
                                                                <Input type="number" min="1" value={ticket.numTickets} onChange={e => updateItem('trainTickets', ticket.id, 'numTickets', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ຊັ້ນປີ້</Label>
                                                                <Input value={ticket.ticketClass} onChange={e => updateItem('trainTickets', ticket.id, 'ticketClass', e.target.value)} placeholder="ເຊັ່ນ ຊັ້ນ 1, ຊັ້ນ 2" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={ticket.currency} onValueChange={(v) => updateItem('trainTickets', ticket.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addTrainTicket}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າປີ້ລົດໄຟ</Button>
                                        </div>
                                    </CostCategoryContent>
                                    {/* Entrance Fees */}
                                    <CostCategoryContent 
                                        title="ຄ່າເຂົ້າຊົມສະຖານທີ່" 
                                        icon={<Camera className="h-5 w-5" />}
                                        summary={<CategorySummary totals={entranceFeeTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.entranceFees?.map((fee, index) => (
                                                <Card key={fee.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ຄ່າເຂົ້າຊົມ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(fee.id)}>
                                                                {itemVisibility[fee.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('entranceFees', fee.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[fee.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ຊື່ສະຖານທີ່</Label>
                                                                <Input value={fee.locationName} onChange={e => updateItem('entranceFees', fee.id, 'locationName', e.target.value)} placeholder="ເຊັ່ນ ພຣະທາດຫຼວງ, ປະຕູໄຊ" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Pax</Label>
                                                                <Input type="number" min="1" value={fee.pax} onChange={e => updateItem('entranceFees', fee.id, 'pax', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ຈຳນວນສະຖານທີ່</Label>
                                                                <Input type="number" min="1" value={fee.numLocations} onChange={e => updateItem('entranceFees', fee.id, 'numLocations', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ</Label>
                                                                <Input type="number" min="0" value={fee.price} onChange={e => updateItem('entranceFees', fee.id, 'price', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={fee.currency} onValueChange={(v) => updateItem('entranceFees', fee.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addEntranceFee}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າເຂົ້າຊົມ</Button>
                                        </div>
                                    </CostCategoryContent>
                                    {/* Meals */}
                                    <CostCategoryContent 
                                        title="ຄ່າອາຫານ" 
                                        icon={<UtensilsCrossed className="h-5 w-5" />}
                                        summary={<CategorySummary totals={mealTotals} />}
                                    >
                                    <div className="space-y-4 pt-2">
                                            {allCosts.meals?.map((meal, index) => (
                                                <Card key={meal.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ລາຍການອາຫານ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(meal.id)}>
                                                                {itemVisibility[meal.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('meals', meal.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[meal.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ຊື່ລາຍການ</Label>
                                                                <Input value={meal.name} onChange={e => updateItem('meals', meal.id, 'name', e.target.value)} placeholder="ເຊັ່ນ ອາຫານເຢັນມື້ທຳອິດ, ຮ້ານ..." />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Pax</Label>
                                                                <Input type="number" min="1" value={meal.pax} onChange={e => updateItem('meals', meal.id, 'pax', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ເຊົ້າ</Label>
                                                                <Input type="number" min="0" value={meal.breakfast} onChange={e => updateItem('meals', meal.id, 'breakfast', parseInt(e.target.value) || 0)} className="h-8"/>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ທ່ຽງ</Label>
                                                                <Input type="number" min="0" value={meal.lunch} onChange={e => updateItem('meals', meal.id, 'lunch', parseInt(e.target.value) || 0)} className="h-8"/>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-xs">ແລງ</Label>
                                                                <Input type="number" min="0" value={meal.dinner} onChange={e => updateItem('meals', meal.id, 'dinner', parseInt(e.target.value) || 0)} className="h-8"/>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ/ມື້</Label>
                                                                <Input type="number" min="0" value={meal.pricePerMeal} onChange={e => updateItem('meals', meal.id, 'pricePerMeal', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={meal.currency} onValueChange={(v) => updateItem('meals', meal.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addMealCost}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າອາຫານ</Button>
                                    </div>
                                    </CostCategoryContent>
                                    {/* Guide */}
                                    <CostCategoryContent 
                                        title="ຄ່າໄກ້" 
                                        icon={<Users className="h-5 w-5" />}
                                        summary={<CategorySummary totals={guideTotals} />}
                                    >
                                    <div className="space-y-4 pt-2">
                                            {allCosts.guides?.map((guide, index) => (
                                                <Card key={guide.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ລາຍການໄກ້ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(guide.id)}>
                                                                {itemVisibility[guide.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('guides', guide.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[guide.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ຊື່ໄກ້/ບໍລິສັດ</Label>
                                                                <Input value={guide.guideName} onChange={e => updateItem('guides', guide.id, 'guideName', e.target.value)} placeholder="ຊື່ໄກ້" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ຈຳນວນໄກ້</Label>
                                                                <Input type="number" min="1" value={guide.numGuides} onChange={e => updateItem('guides', guide.id, 'numGuides', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ຈຳນວນວັນ</Label>
                                                                <Input type="number" min="1" value={guide.numDays} onChange={e => updateItem('guides', guide.id, 'numDays', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ/ວັນ</Label>
                                                                <Input type="number" min="0" value={guide.pricePerDay} onChange={e => updateItem('guides', guide.id, 'pricePerDay', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={guide.currency} onValueChange={(v) => updateItem('guides', guide.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addGuideFee}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າໄກ້</Button>
                                    </div>
                                    </CostCategoryContent>
                                    {/* Documents */}
                                    <CostCategoryContent 
                                        title="ຄ່າເອກະສານ" 
                                        icon={<FileText className="h-5 w-5" />}
                                        summary={<CategorySummary totals={documentTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.documents?.map((doc, index) => (
                                                <Card key={doc.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ລາຍການເອກະສານ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(doc.id)}>
                                                                {itemVisibility[doc.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('documents', doc.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[doc.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                            <Label>ຊື່ເອກະສານ</Label>
                                                            <Input value={doc.documentName} onChange={e => updateItem('documents', doc.id, 'documentName', e.target.value)} placeholder="ເຊັ່ນ ຄ່າວີຊາ, ຄ່າເອກະສານຜ່ານແດນ" />
                                                        </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Pax</Label>
                                                                <Input type="number" min="1" value={doc.pax} onChange={e => updateItem('documents', doc.id, 'pax', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ</Label>
                                                                <Input type="number" min="0" value={doc.price} onChange={e => updateItem('documents', doc.id, 'price', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={doc.currency} onValueChange={(v) => updateItem('documents', doc.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addDocumentFee}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າເອກະສານ</Button>
                                        </div>
                                    </CostCategoryContent>

                                    {/* Overseas Package */}
                                    <CostCategoryContent 
                                        title="ຄ່າເພັກເກດຕ່າງປະເທດ" 
                                        icon={<Earth className="h-5 w-5" />}
                                        summary={<CategorySummary totals={overseasPackageTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.overseasPackages?.map((pkg, index) => (
                                                <Card key={pkg.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">Package #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(pkg.id)}>
                                                                {itemVisibility[pkg.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('overseasPackages', pkg.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[pkg.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2 col-span-2">
                                                                <Label>ຊື່ ຫຼື ລາຍລະອຽດແພັກເກດ</Label>
                                                                <Input value={pkg.name} onChange={e => updateItem('overseasPackages', pkg.id, 'name', e.target.value)} placeholder="ເຊັ່ນ ຄ່າແພັກເກດທົວຈີນ" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ (USD)</Label>
                                                                <Input type="number" min="0" value={pkg.priceUSD} onChange={e => updateItem('overseasPackages', pkg.id, 'priceUSD', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ (THB)</Label>
                                                                <Input type="number" min="0" value={pkg.priceTHB} onChange={e => updateItem('overseasPackages', pkg.id, 'priceTHB', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ (CNY)</Label>
                                                                <Input type="number" min="0" value={pkg.priceCNY} onChange={e => updateItem('overseasPackages', pkg.id, 'priceCNY', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addOverseasPackage}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າແພັກເກດ</Button>
                                        </div>
                                    </CostCategoryContent>
                                    {/* Activities */}
                                    <CostCategoryContent 
                                        title="ຄ່າກິດຈະກຳ" 
                                        icon={<Ticket className="h-5 w-5" />}
                                        summary={<CategorySummary totals={activityTotals} />}
                                    >
                                        <div className="space-y-4 pt-2">
                                            {allCosts.activities?.map((activity, index) => (
                                                <Card key={activity.id} className="bg-muted/30">
                                                    <CardHeader className="flex-row items-center justify-between p-3 bg-muted/50">
                                                        <CardTitle className="text-base">ກິດຈະກຳ #{index + 1}</CardTitle>
                                                        <div>
                                                            <Button variant="ghost" size="icon" onClick={() => toggleItemVisibility(activity.id)}>
                                                                {itemVisibility[activity.id] === false ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => deleteItem('activities', activity.id)}><Trash2 className="h-4 w-4 text-red-500"/></Button>
                                                        </div>
                                                    </CardHeader>
                                                    {(itemVisibility[activity.id] !== false) && (
                                                    <CardContent className="p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>ຊື່ກິດຈະກຳ</Label>
                                                                <Input value={activity.name} onChange={e => updateItem('activities', activity.id, 'name', e.target.value)} placeholder="ເຊັ່ນ: ຂີ່ຊ້າງ, ລ່ອງເຮືອ" />
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <Label>Pax</Label>
                                                                <Input type="number" min="1" value={activity.pax} onChange={e => updateItem('activities', activity.id, 'pax', parseInt(e.target.value) || 1)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ລາຄາ</Label>
                                                                <Input type="number" min="0" value={activity.price} onChange={e => updateItem('activities', activity.id, 'price', parseFloat(e.target.value) || 0)} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>ສະກຸນເງິນ</Label>
                                                                <Select value={activity.currency} onValueChange={(v) => updateItem('activities', activity.id, 'currency', v)}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>{(Object.keys(currencySymbols) as Currency[]).map(c => (<SelectItem key={c} value={c}>{currencySymbols[c]}</SelectItem>))}</SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                    )}
                                                </Card>
                                            ))}
                                            <Button onClick={addActivity}><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມຄ່າກິດຈະກຳ</Button>
                                        </div>
                                    </CostCategoryContent>
                                </Accordion>
                            </CardContent>
                        </Card>
                        
                        <div className="hidden print:block print:space-y-2 print:pt-4">
                            <TotalCostCard totalsByCategory={totalsByCategory} />
                        </div>
                        <div className="print:hidden"><TotalCostCard totalCost={grandTotals} /></div>

                        <div className="hidden print:block print:space-y-2 print:pt-4">
                            <Card>
                                <CardHeader className="print:px-2 print:py-1">
                                    <CardTitle className="print:text-sm print:font-bold">ຄ່າໃຊ້ຈ່າຍລວມທັງໝົດ</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-4 gap-2 print:p-2">
                                    {(Object.keys(grandTotals) as Currency[]).map(currency => (
                                        <Card key={currency} className="print:shadow-none print:border">
                                            <CardHeader className="pb-1 print:p-1">
                                                <CardTitle className="print:text-xs">{currency}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="print:p-1">
                                                <p className="print:text-sm font-bold">{formatNumber(grandTotals[currency])}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <div className="print:hidden">
                             <Card>
                                <CardHeader>
                                    <CardTitle>ຄ່າໃຊ້ຈ່າຍລວມທັງໝົດ</CardTitle>
                                    <CardDescription>ສະຫຼຸບລວມຍອດຄ່າໃຊ້ຈ່າຍທັງໝົດແຍກຕາມສະກຸນເງິນ</CardDescription>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {(Object.keys(grandTotals) as Currency[]).map(currency => (
                                        <Card key={currency}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-lg">{currency}</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-2xl font-bold">{formatNumber(grandTotals[currency])}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                        <ExchangeRateCard 
                            totalCost={grandTotals} 
                            rates={exchangeRates} 
                            onRatesChange={handleRatesChange}
                            profitPercentage={profitPercentage}
                            onProfitPercentageChange={setProfitPercentage}
                         />
                    </div>
                </div>
            </main>
        </div>
    );
}
