
"use client"

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Trash2, PlusCircle, Calendar as CalendarIcon, Printer, Eye, EyeOff, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
    listenToTourCostItemsForProgram, 
    addTourCostItem, 
    updateTourCostItem, 
    deleteTourCostItem, 
    listenToTourIncomeItemsForProgram,
    addTourIncomeItem,
    updateTourIncomeItem,
    deleteTourIncomeItem,
    updateTourProgram,
} from '@/services/tourProgramService';
import type { TourCostItem, TourIncomeItem, TourProgram, Currency, ExchangeRates, DividendItem } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { ExchangeRateCard } from '@/components/tour/ExchangeRateCard';
import { toDateSafe } from '@/lib/timestamp';

const formatCurrency = (value: number | null | undefined, includeSymbol = false) => {
    if (value === null || value === undefined || isNaN(value)) return includeSymbol ? '0' : '';
    const formatted = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(value);
    return formatted;
};

const parseFormattedNumber = (value: string): number => {
    return Number(value.replace(/,/g, '')) || 0;
};

const allCurrencies: Currency[] = ['LAK', 'THB', 'USD', 'CNY'];

const initialDividendStructure = [
    { id: '1', name: 'ບໍລິສັດ', percentage: 0.30 },
    { id: '2', name: 'xiuge', percentage: 0.10 },
    { id: '3', name: 'wenyan', percentage: 0.10 },
    { id: '4', name: 'ການຕະຫຼາດ', percentage: 0.15 },
    { id: '5', name: 'CEO', percentage: 0.30 },
    { id: '6', name: 'ບັນຊີ', percentage: 0.05 },
];

const initialRates: ExchangeRates = {
    USD: { THB: 38, LAK: 25000, CNY: 8 },
    THB: { USD: 0.032, LAK: 700, CNY: 0.25 },
    CNY: { USD: 0.20, THB: 6, LAK: 3500 },
    LAK: { USD: 0.00005, THB: 0.0015, CNY: 0.00035 },
};

const CurrencyEntryTable = ({ 
    items, 
    onUpdateItem,
    onDeleteItem,
    onAddItem,
    title,
    description,
    onSave,
    isSaving,
}: { 
    items: (TourCostItem[] | TourIncomeItem[]),
    onUpdateItem: (id: string, field: keyof (TourCostItem | TourIncomeItem), value: any) => void,
    onDeleteItem: (id: string) => Promise<void>,
    onAddItem: () => Promise<void>,
    title: string,
    description: string,
    onSave: () => void,
    isSaving: boolean
}) => {
    
    const totals = useMemo(() => {
        return (items as Array<TourCostItem | TourIncomeItem>).reduce((acc, item) => {
            acc.lak += item.lak || 0;
            acc.thb += item.thb || 0;
            acc.usd += item.usd || 0;
            acc.cny += item.cny || 0;
            return acc;
        }, { lak: 0, thb: 0, usd: 0, cny: 0 });
    }, [items]);

    const handleBlur = (id: string, field: keyof (TourCostItem | TourIncomeItem), value: any) => {
        onUpdateItem(id, field, value);
    }
    
    return (
        <Card className="print:shadow-none print:border-none">
            <CardHeader className="flex flex-row items-center justify-between print:hidden">
                 <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
                 <div className="flex items-center gap-2">
                    <Button size="sm" onClick={onAddItem}>
                        <PlusCircle className="mr-2 h-4 w-4"/>
                        ເພີ່ມລາຍການ
                    </Button>
                    <Button size="sm" onClick={onSave} disabled={isSaving} variant="secondary">
                        <Save className="mr-2 h-4 w-4"/>
                        {isSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກລາຍການ'}
                    </Button>
                </div>
            </CardHeader>
             <CardContent className="print:p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[150px] print:w-[100px] print:text-xs print:font-lao">ວັນທີ (Date)</TableHead>
                                <TableHead className="print:font-lao">ລາຍລະອຽດ (Description)</TableHead>
                                <TableHead className="text-right">LAK</TableHead>
                                <TableHead className="text-right">THB</TableHead>
                                <TableHead className="text-right">USD</TableHead>
                                <TableHead className="text-right">CNY</TableHead>
                                <TableHead className="w-[50px] print:hidden"><span className="sr-only">ລົບ</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(items as Array<TourCostItem | TourIncomeItem>).map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="p-1">
                                        <Popover>
                                            <PopoverTrigger asChild className="print:hidden">
                                                <Button variant="outline" className="w-full justify-start text-left font-normal h-8 text-xs">
                                                     <CalendarIcon className="mr-1 h-3 w-3" />
                                                    {item.date ? format(item.date, "dd/MM/yy") : <span>ເລືອກວັນທີ</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={item.date || undefined}
                                                    onSelect={(date) => handleBlur(item.id, 'date', date || new Date())}
                                                    initialFocus
                                                    
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <span className="hidden print:inline print:text-xs">{item.date ? format(item.date, "dd/MM/yy") : ''}</span>
                                    </TableCell>
                                     <TableCell className="p-1">
                                        <Input 
                                            defaultValue={item.detail || ''} 
                                            onBlur={(e) => handleBlur(item.id, 'detail', e.target.value)}
                                            className="h-8 print:border-none print:pl-0 print:font-lao print:text-sm"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1">
                                        <Input
                                            type="text"
                                            defaultValue={formatCurrency(item.lak)}
                                            onBlur={(e) => handleBlur(item.id, 'lak', parseFormattedNumber(e.target.value))}
                                            className="h-8 text-right print:border-none print:text-sm"
                                        />
                                    </TableCell>
                                     <TableCell className="p-1">
                                        <Input
                                            type="text"
                                            defaultValue={formatCurrency(item.thb)}
                                            onBlur={(e) => handleBlur(item.id, 'thb', parseFormattedNumber(e.target.value))}
                                            className="h-8 text-right print:border-none print:text-sm"
                                        />
                                    </TableCell>
                                     <TableCell className="p-1">
                                        <Input
                                            type="text"
                                            defaultValue={formatCurrency(item.usd)}
                                            onBlur={(e) => handleBlur(item.id, 'usd', parseFormattedNumber(e.target.value))}
                                            className="h-8 text-right print:border-none print:text-sm"
                                        />
                                    </TableCell>
                                     <TableCell className="p-1">
                                        <Input
                                            type="text"
                                            defaultValue={formatCurrency(item.cny)}
                                            onBlur={(e) => handleBlur(item.id, 'cny', parseFormattedNumber(e.target.value))}
                                            className="h-8 text-right print:border-none print:text-sm"
                                        />
                                    </TableCell>
                                    <TableCell className="p-1 text-center print:hidden">
                                        <Button variant="ghost" size="icon" onClick={() => onDeleteItem(item.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableFooter className="print:hidden">
                            <TableRow className="bg-muted font-bold">
                                <TableCell colSpan={2} className="text-right print:font-lao">ລວມ (Total)</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.lak)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.thb)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.usd)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.cny)}</TableCell>
                                <TableCell className="print:hidden"></TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
                 <div className="hidden print:block pt-4">
                    <Table>
                        <TableFooter>
                            <TableRow className="bg-muted font-bold">
                                <TableCell colSpan={2} className="text-right print:font-lao">ລວມ (Total)</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.lak)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.thb)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.usd)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(totals.cny)}</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

const SummaryCard = ({ title, value, currency, isProfit = false }: { title: string; value: number; currency: string; isProfit?: boolean }) => {
    const profitColor = value >= 0 ? 'text-green-600' : 'text-red-600';
    return (
        <Card className="print:shadow-none print:border print:p-0">
            <CardHeader className="pb-2 print:p-1 print:font-lao">
                <CardTitle className="text-base print:text-xs">{title}</CardTitle>
                <CardDescription className="print:text-xs">{currency}</CardDescription>
            </CardHeader>
            <CardContent className="print:p-1">
                <p className={`text-2xl font-bold print:text-base ${isProfit ? profitColor : ''}`}>{formatCurrency(value, true)}</p>
            </CardContent>
        </Card>
    );
};

const CurrencyInput = ({ label, amount, currency, onAmountChange, onCurrencyChange }: {
    label: string;
    amount: number;
    currency: Currency;
    onAmountChange: (value: number) => void;
    onCurrencyChange: (value: Currency) => void;
}) => (
    <div className="grid gap-2">
        <Label htmlFor={label.toLowerCase()} className="print:hidden">{label}</Label>
        <p className="hidden print:block print:text-xs font-semibold">{label}</p>
        <div className="flex gap-2">
            <Input
                id={label.toLowerCase()}
                type="number"
                value={amount || ''}
                onChange={(e) => onAmountChange(Number(e.target.value))}
                className="w-2/3 print:hidden"
            />
            <Select value={currency} onValueChange={(v) => onCurrencyChange(v as Currency)}>
                <SelectTrigger className="w-1/3 print:hidden">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {allCurrencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
            </Select>
            <p className="hidden print:block print:text-sm">{`${formatCurrency(amount)} ${currency}`}</p>
        </div>
    </div>
);

type TabValue = 'info' | 'income' | 'costs' | 'summary' | 'dividend';

export default function TourProgramClientPage({ initialProgram }: { initialProgram: TourProgram }) {
    const { toast } = useToast();
    
    const [localProgram, setLocalProgram] = useState<TourProgram | null>(initialProgram);
    const [costItems, setCostItems] = useState<TourCostItem[]>([]);
    const [incomeItems, setIncomeItems] = useState<TourIncomeItem[]>([]);
    const [printCurrencies, setPrintCurrencies] = useState<Currency[]>(['LAK']);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isTableSaving, setIsTableSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<TabValue>('info');
    const [dividendStructure, setDividendStructure] = useState<DividendItem[]>(initialDividendStructure);
    
    const [loading, setLoading] = useState(!initialProgram);
    const [error, setError] = useState<string | null>(null);

    const [exchangeRates, setExchangeRates] = useState<ExchangeRates>(initialRates);
    const [isSavingRates, setIsSavingRates] = useState(false);

    useEffect(() => {
        if (!initialProgram && localProgram?.id) {
             setLoading(true);
             const fetchProgram = async () => {
                 try {
                    const fetchedProgram = await new Promise<TourProgram | null>((resolve) => setTimeout(() => resolve(initialProgram), 1000));
                    if (fetchedProgram) {
                        setLocalProgram(fetchedProgram);
                        setExchangeRates(fetchedProgram.exchangeRates || initialRates);
                    } else {
                        setError('Program not found');
                    }
                 } catch(err) {
                     setError('Failed to load program data');
                 } finally {
                     setLoading(false);
                 }
             }
             fetchProgram();
        } else {
            setLocalProgram(initialProgram);
            setExchangeRates(initialProgram?.exchangeRates || initialRates);
            setLoading(false);
        }

    }, [initialProgram, localProgram?.id]);


    useEffect(() => {
        if (!localProgram?.id) return;

        const unsubscribeCosts = listenToTourCostItemsForProgram(localProgram.id, setCostItems);
        const unsubscribeIncomes = listenToTourIncomeItemsForProgram(localProgram.id, setIncomeItems);
        
        if (localProgram.priceCurrency) {
            setPrintCurrencies([localProgram.priceCurrency]);
        }

        return () => {
            unsubscribeCosts();
            unsubscribeIncomes();
        };
    }, [localProgram?.id, localProgram?.priceCurrency]);

    const handleProgramChange = useCallback((field: keyof TourProgram, value: any) => {
        setLocalProgram(prev => prev ? ({ ...prev, [field]: value }) : null);
    }, []);

    const handleSaveProgramInfo = useCallback(async () => {
        if (!localProgram || isSaving) return;
        
        setIsSaving(true);
        try {
            let updatedProgram = { ...localProgram, exchangeRates };
             if (updatedProgram.priceCurrency === updatedProgram.bankChargeCurrency) {
                updatedProgram.totalPrice = (updatedProgram.price || 0) + (updatedProgram.bankCharge || 0);
            } else {
                updatedProgram.totalPrice = updatedProgram.price || 0;
            }

            const { id, createdAt, date, ...dataToUpdate } = updatedProgram;
            await updateTourProgram(id, dataToUpdate);
            
            setLocalProgram(updatedProgram);

            toast({ title: "ບັນທຶກຂໍ້ມູນໂປຣແກຣມແລ້ວ" });
        } catch (error) {
             console.error("Failed to save program info:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }, [localProgram, isSaving, toast, exchangeRates]);

     const handleSaveRates = async () => {
        if (!localProgram?.id) return;
        setIsSavingRates(true);
        try {
            await updateTourProgram(localProgram.id, { exchangeRates });
            toast({ title: "ບັນທຶກອັດຕາແລກປ່ຽນສຳເລັດ" });
        } catch (error) {
            console.error("Failed to save exchange rates:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ", variant: "destructive" });
        } finally {
            setIsSavingRates(false);
        }
    };
    
    const handleAddCostItem = async () => {
        if (!localProgram?.id) return;
        try {
            await addTourCostItem(localProgram.id);
        } catch (error) { toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການເພີ່ມຕົ້ນທຶນ", variant: "destructive" }); }
    };
    
    const handleUpdateCostItem = useCallback((itemId: string, field: keyof TourCostItem, value: any) => {
        setCostItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    }, []);

    const handleSaveCostItems = async () => {
        setIsTableSaving(true);
        const promises = costItems.map(item => {
            const { id, ...dataToUpdate } = item;
            return updateTourCostItem(id, dataToUpdate);
        });
        try {
            await Promise.all(promises);
            toast({title: "ບັນທຶກລາຍຈ່າຍສຳເລັດ"});
        } catch (error) {
            console.error("Error saving cost items", error);
            toast({title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກລາຍຈ່າຍ", variant: "destructive"})
        } finally {
            setIsTableSaving(false);
        }
    };

    const handleDeleteCostItem = async (itemId: string) => {
        if (!window.confirm("ยืนยันการลบรายการต้นทุนนี้?")) return;
        try { await deleteTourCostItem(itemId); toast({title: "ลบรายการต้นทุนสำเร็จ"}); } 
        catch (error) { toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການລົບຕົ້ນທຶນ", variant: "destructive" }); }
    };

    const handleAddIncomeItem = async () => {
        if (!localProgram?.id) return;
        try {
            await addTourIncomeItem(localProgram.id);
        } catch (error) { toast({ title: "ເກີດຂໍ້ຜິດພາດໃນการเพิ่มรายรับ", variant: "destructive" }); }
    };

    const handleUpdateIncomeItem = useCallback((itemId: string, field: keyof TourIncomeItem, value: any) => {
        setIncomeItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: value } : item));
    }, []);
    
    const handleSaveIncomeItems = async () => {
        setIsTableSaving(true);
        const promises = incomeItems.map(item => {
            const { id, ...dataToUpdate } = item;
            return updateTourIncomeItem(id, dataToUpdate);
        });
        try {
            await Promise.all(promises);
            toast({title: "ບັນທຶກລາຍຮັບສຳເລັດ"});
        } catch (error) {
            console.error("Error saving income items", error);
            toast({title: "ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກລາຍຮັບ", variant: "destructive"})
        } finally {
            setIsTableSaving(false);
        }
    };

    const handleDeleteIncomeItem = async (itemId: string) => {
        if (!window.confirm("ยืนยันการลบรายการรายรับนี้?")) return;
        try { await deleteTourIncomeItem(itemId); toast({title: "ลบรายการรายรับสำเร็จ"}); } 
        catch (error) { toast({ title: "เกิดข้อผิดพลาดในการลบรายรับ", variant: "destructive" }); }
    };

    const handlePrint = () => {
        window.print();
    }

    const summaryData = useMemo(() => {
        const totalCosts: Record<Currency, number> = { LAK: 0, THB: 0, USD: 0, CNY: 0 };
        costItems.forEach(item => {
            totalCosts.LAK += item.lak || 0;
            totalCosts.THB += item.thb || 0;
            totalCosts.USD += item.usd || 0;
            totalCosts.CNY += item.cny || 0;
        });

        const totalIncomes: Record<Currency, number> = { LAK: 0, THB: 0, USD: 0, CNY: 0 };
        incomeItems.forEach(item => {
            totalIncomes.LAK += item.lak || 0;
            totalIncomes.THB += item.thb || 0;
            totalIncomes.USD += item.usd || 0;
            totalIncomes.CNY += item.cny || 0;
        });
        
        const profit = allCurrencies.reduce((acc, c) => {
            acc[c] = (totalIncomes[c] || 0) - (totalCosts[c] || 0);
            return acc;
        }, { LAK: 0, THB: 0, USD: 0, CNY: 0 } as Record<Currency, number>);
        
        return { totalCosts, totalIncomes, profit };
    }, [costItems, incomeItems]);
    
    
    const handlePrintCurrencyToggle = (currency: Currency) => {
        setPrintCurrencies(prev => 
            prev.includes(currency) 
                ? prev.filter(c => c !== currency) 
                : [...prev, currency]
        );
    };

    // Dividend functions
    const handleDividendChange = (id: string, field: 'name' | 'percentage', value: string | number) => {
        setDividendStructure(prev => prev.map(item => {
            if (item.id === id) {
                if (field === 'percentage' && (typeof value === 'string' || typeof value === 'number')) {
                    return { ...item, percentage: Number(value) / 100 };
                }
                if (field === 'name' && typeof value === 'string') {
                    return { ...item, name: value };
                }
            }
            return item;
        }));
    };

    const addDividendRow = () => {
        setDividendStructure(prev => [...prev, { id: Date.now().toString(), name: '', percentage: 0 }]);
    };

    const removeDividendRow = (id: string) => {
        setDividendStructure(prev => prev.filter(item => item.id !== id));
    };
    
    const totalPercentage = useMemo(() => {
        return dividendStructure.reduce((sum, item) => sum + (item.percentage || 0), 0);
    }, [dividendStructure]);
    
     if (loading) {
        return (
             <div className="flex flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center p-8">{error}</div>;
    }

    if (!localProgram) {
        return <div className="text-center p-8">Program not found.</div>;
    }
    
    const PrintHeader = ({ title }: { title: string }) => (
        <div className="hidden print:block print:space-y-4 pb-4 mb-4">
            <h2 className="text-lg font-bold mb-2 text-center font-lao">{title}</h2>
            <div className="grid grid-cols-2 gap-x-8 text-sm border-b-2 border-slate-300 pb-4">
                <div className="space-y-1">
                    <div className="flex justify-between"><strong className="font-semibold">Tour Program:</strong><span>{localProgram.programName}</span></div>
                    <div className="flex justify-between"><strong className="font-semibold">Tour Dates:</strong><span className="whitespace-pre-wrap text-right">{localProgram.tourDates}</span></div>
                    <div className="flex justify-between"><strong className="font-semibold">Duration:</strong><span>{localProgram.durationDays} days</span></div>
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between"><strong className="font-semibold">Group Code:</strong><span>{localProgram.tourCode}</span></div>
                    <div className="flex justify-between"><strong className="font-semibold">Nationality:</strong><span>{localProgram.groupName}</span></div>
                    <div className="flex justify-between"><strong className="font-semibold">Pax:</strong><span>{localProgram.pax}</span></div>
                    <div className="flex justify-between"><strong className="font-semibold">Destination:</strong><span>{localProgram.destination}</span></div>
                </div>
            </div>
            {activeTab === 'summary' && (
                <div className="hidden print:grid print:grid-cols-2 print:gap-x-8 print:text-sm print:border-b-2 print:border-slate-300 print:pb-4 print:mb-4">
                    <div>
                        <div className="flex justify-between"><strong className="font-semibold">Price:</strong><span className="font-bold">{`${formatCurrency(localProgram.price)} ${localProgram.priceCurrency}`}</span></div>
                        <div className="flex justify-between"><strong className="font-semibold">Bank Charge:</strong><span className="font-bold">{`${formatCurrency(localProgram.bankCharge)} ${localProgram.bankChargeCurrency}`}</span></div>
                    </div>
                    <div>
                        <div className="flex justify-between"><strong className="font-semibold">Total Price:</strong><span className="font-bold">{`${formatCurrency(localProgram.totalPrice)} ${localProgram.priceCurrency}`}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
    
    const ProgramInfoCard = () => {
        const createdAtDate = toDateSafe(localProgram.createdAt);
        return (
             <Card className="print:hidden">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>ລາຍລະອຽດໂປຣແກຣມ ແລະ ຂໍ້ມູນກຸ່ມ</CardTitle>
                        <CardDescription>
                            ວັນທີສ້າງ: {createdAtDate ? format(createdAtDate, "PPP", {locale: th}) : '-'}
                            {isSaving && <span className="ml-4 text-blue-500 animate-pulse">ກຳລັງບັນທຶກ...</span>}
                        </CardDescription>
                    </div>
                    <Button onClick={handleSaveProgramInfo} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? 'ກຳລັງບັນທຶກ' : 'ບັນທຶກການປ່ຽນແປງ'}
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-3">
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-semibold w-1/4">ຊື່ໂປຣແກຣມ</TableCell>
                                        <TableCell>
                                            <Input id="programName" value={localProgram.programName || ''} onChange={(e) => handleProgramChange('programName', e.target.value)} />
                                        </TableCell>
                                        <TableCell className="font-semibold w-1/4">ລະຫັດກຸ່ມ</TableCell>
                                        <TableCell>
                                             <Input id="tourCode" value={localProgram.tourCode || ''} onChange={(e) => handleProgramChange('tourCode', e.target.value)} />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">ສັນຊາດ</TableCell>
                                        <TableCell>
                                            <Input id="groupName" value={localProgram.groupName || ''} onChange={(e) => handleProgramChange('groupName', e.target.value)} />
                                        </TableCell>
                                        <TableCell className="font-semibold">ຈຳນວນຄົນ</TableCell>
                                        <TableCell>
                                            <Input id="pax" type="number" value={localProgram.pax || ''} onChange={(e) => handleProgramChange('pax', Number(e.target.value) || 0)} />
                                        </TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell className="font-semibold">ຈຸດໝາຍ</TableCell>
                                        <TableCell>
                                            <Input id="destination" value={localProgram.destination || ''} onChange={(e) => handleProgramChange('destination', e.target.value)} />
                                        </TableCell>
                                        <TableCell className="font-semibold">ໄລຍະເວລາ (ວັນ)</TableCell>
                                        <TableCell>
                                            <Input id="durationDays" type="number" value={localProgram.durationDays || ''} onChange={(e) => handleProgramChange('durationDays', Number(e.target.value) || 0)} />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                         <TableCell className="font-semibold align-top">ວັນທີເດີນທາງ</TableCell>
                                        <TableCell colSpan={3}>
                                            <Textarea id="tourDates" value={localProgram.tourDates || ''} onChange={(e) => handleProgramChange('tourDates', e.target.value)} />
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">ລາຄາ</TableCell>
                                        <TableCell>
                                            <CurrencyInput 
                                                label="Price"
                                                amount={localProgram.price}
                                                currency={localProgram.priceCurrency}
                                                onAmountChange={(v) => handleProgramChange('price', v)}
                                                onCurrencyChange={(v) => handleProgramChange('priceCurrency', v)}
                                             />
                                        </TableCell>
                                         <TableCell className="font-semibold">ຄ່າທຳນຽມທະນາຄານ</TableCell>
                                        <TableCell>
                                            <CurrencyInput 
                                                label="Bank Charge"
                                                amount={localProgram.bankCharge}
                                                currency={localProgram.bankChargeCurrency}
                                                onAmountChange={(v) => handleProgramChange('bankCharge', v)}
                                                onCurrencyChange={(v) => handleProgramChange('bankChargeCurrency', v)}
                                             />
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40 print:bg-white">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">
        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
          <Link href="/tour-programs">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">ກັບໄປໜ้ารາຍການ</span>
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight font-headline">{localProgram.programName || 'ລາຍລະອຽດໂປຣແກຣມທົວ'}</h1>
        </div>
        <div className="ml-auto flex items-center gap-4">
             <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">ສະກຸນເງິນສຳລັບພິມ:</span>
                {allCurrencies.map((currency) => (
                <div key={currency} className="flex items-center space-x-1">
                    <Checkbox
                        id={`print-${currency}`}
                        checked={printCurrencies.includes(currency)}
                        onCheckedChange={() => handlePrintCurrencyToggle(currency)}
                    />
                    <Label htmlFor={`print-${currency}`} className="text-sm font-normal">{currency}</Label>
                </div>
                ))}
            </div>
            <Button onClick={handlePrint} size="sm" variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                ພິມ
            </Button>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 print:p-2 print:gap-1">
        <Tabs defaultValue="info" onValueChange={(v) => setActiveTab(v as TabValue)} className="mt-4">
          <TabsList className="grid w-full grid-cols-5 print:hidden">
              <TabsTrigger value="info">ຂໍ້ມູນໂປຣແກຣມ</TabsTrigger>
              <TabsTrigger value="income">ບັນທຶກລາຍຮັບ</TabsTrigger>
              <TabsTrigger value="costs">ຄຳນວນຕົ້ນທຶນ</TabsTrigger>
              <TabsTrigger value="summary">ສະຫຼຸບຜົນ</TabsTrigger>
              <TabsTrigger value="dividend">ປັນຜົນ</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="mt-4">
              <ProgramInfoCard />
          </TabsContent>
          <TabsContent value="income" className="mt-4">
               <div className={activeTab === 'income' ? 'block' : 'hidden'}>
                  <PrintHeader title="ລາຍຮັບ (Total Income)" />
                  <CurrencyEntryTable 
                      items={incomeItems}
                      onAddItem={handleAddIncomeItem}
                      onUpdateItem={handleUpdateIncomeItem}
                      onDeleteItem={handleDeleteIncomeItem}
                      title="ຕາຕະລາງບັນທຶກລາຍຮັບ"
                      description="ບັນທຶກລາຍຮັບທັງໝົດຂອງໂປຣແກຣມນີ້"
                      onSave={handleSaveIncomeItems}
                      isSaving={isTableSaving}
                  />
              </div>
          </TabsContent>
          <TabsContent value="costs" className="mt-4">
               <div className={activeTab === 'costs' ? 'block' : 'hidden'}>
                  <PrintHeader title="ລາຍຈ່າຍ (Total Costs)" />
                  <CurrencyEntryTable 
                      items={costItems}
                      onAddItem={handleAddCostItem}
                      onUpdateItem={handleUpdateCostItem}
                      onDeleteItem={handleDeleteCostItem}
                      title="ຕາຕະລາງຄຳນວນຕົ້ນທຶນ"
                      description="ບັນທຶກຄ່າໃຊ້ຈ່າຍທັງໝົດຂອງໂປຣແກຣມນີ້"
                      onSave={handleSaveCostItems}
                      isSaving={isTableSaving}
                  />
              </div>
          </TabsContent>
          <TabsContent value="summary" className="mt-4">
                <div className={activeTab === 'summary' ? 'block' : 'hidden'}>
                    <PrintHeader title="ສະຫຼຸບໂປຣແກມທົວ (Tour Program Summary)" />
                    <div className="hidden print:block space-y-4">
                        <div className="space-y-2">
                           <h3 className="text-base font-semibold border-b pb-1 font-lao">ລາຍຮັບ (Total Income)</h3>
                           <div className="flex justify-between text-sm pr-4">
                               <span className="font-lao">ລວມ (Total)</span>
                               <div className='flex gap-4 font-semibold'>
                                   {printCurrencies.map(c => <span key={c}>{`${formatCurrency((summaryData.totalIncomes as any)[c.toLowerCase()])} ${c}`}</span>)}
                               </div>
                           </div>
                       </div>
                       <div className="space-y-2">
                           <h3 className="text-base font-semibold border-b pb-1 font-lao">ລາຍຈ່າຍ (Total Costs)</h3>
                           <div className="flex justify-between text-sm pr-4">
                               <span className="font-lao">ລວມ (Total)</span>
                               <div className='flex gap-4 font-semibold'>
                                   {printCurrencies.map(c => <span key={c}>{`${formatCurrency((summaryData.totalCosts as any)[c.toLowerCase()])} ${c}`}</span>)}
                               </div>
                           </div>
                       </div>
                        <div className="space-y-2">
                             <h3 className="text-base font-semibold border-b pb-1 font-lao">ກໍາໄລ/ຂາດທຶນ (Profit/Loss Summary)</h3>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="font-lao">ສະກຸນເງິນ (Currency)</TableHead>
                                        <TableHead className="text-right">ລາຍຮັບ (Income)</TableHead>
                                        <TableHead className="text-right">ລາຍຈ່າຍ (Costs)</TableHead>
                                        <TableHead className="text-right">ກໍາໄລ/ຂາດທຶນ (Profit/Loss)</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {printCurrencies.map(c => {
                                        const currencyKey = c;
                                        return (
                                            <TableRow key={c}>
                                                <TableCell className="font-medium">{c}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(summaryData.totalIncomes[currencyKey])}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(summaryData.totalCosts[currencyKey])}</TableCell>
                                                <TableCell className={`text-right font-bold ${summaryData.profit[currencyKey] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(summaryData.profit[currencyKey])}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                             </Table>
                        </div>
                    </div>
                </div>
              <Card className="print:hidden">
                  <CardHeader>
                      <CardTitle>ສະຫຼຸບຜົນປະກອບການ</CardTitle>
                      <CardDescription>ສະຫຼຸບລາຍຮັບ, ຕົ້ນທຶນ, และกำไร/ขาดทุน สำหรับໂປຣແກຣມນີ້</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 print:p-0 print:space-y-2">
                       <div>
                          <h3 className="text-lg font-semibold mb-2 print:font-lao print:text-sm print:font-bold print:border-b print:pb-1">ລາຍຮັບ (Total Income)</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                              <SummaryCard title="ລາຍຮັບ" value={summaryData.totalIncomes.LAK} currency="LAK" />
                              <SummaryCard title="ລາຍຮັບ" value={summaryData.totalIncomes.THB} currency="THB" />
                              <SummaryCard title="ລາຍຮັບ" value={summaryData.totalIncomes.USD} currency="USD" />
                              <SummaryCard title="ລາຍຮັບ" value={summaryData.totalIncomes.CNY} currency="CNY" />
                          </div>
                      </div>
                      <div>
                          <h3 className="text-lg font-semibold mb-2 print:font-lao print:text-sm print:font-bold print:border-b print:pb-1">ລາຍຈ່າຍ (Total Costs)</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
                              <SummaryCard title="ຕົ້ນທຶນ" value={summaryData.totalCosts.LAK} currency="LAK" />
                              <SummaryCard title="ຕົ້ນທຶນ" value={summaryData.totalCosts.THB} currency="THB" />
                              <SummaryCard title="ຕົ້ນທຶນ" value={summaryData.totalCosts.USD} currency="USD" />
                              <SummaryCard title="ຕົ້ນທຶນ" value={summaryData.totalCosts.CNY} currency="CNY" />
                          </div>
                      </div>
                      <ExchangeRateCard 
                            totalIncome={summaryData.totalIncomes}
                            totalCost={summaryData.totalCosts}
                            rates={exchangeRates} 
                            onRatesChange={setExchangeRates}
                            onSave={handleSaveRates}
                            isSaving={isSavingRates}
                        />
                  </CardContent>
              </Card>
          </TabsContent>
           <TabsContent value="dividend" className="mt-4">
              <Card>
                  <CardHeader>
                      <CardTitle>ການແບ່ງປັນຜົນກຳໄລ (ປັນຜົນ)</CardTitle>
                      <CardDescription>
                          ຄຳນວນ ແລະ ຈັດການການປັນຜົນຂອງໂປຣແກຣມນີ້.
                      </CardDescription>
                        <div className="pt-2 text-sm text-muted-foreground space-y-1">
                            <p><span className="font-semibold">Group Code:</span> {localProgram.tourCode}</p>
                            <div className="flex flex-wrap gap-x-4">
                                <span className="font-semibold">Profit:</span>
                                {Object.entries(summaryData.profit).map(([currency, value]) => (
                                    (value !== 0) && <span key={currency}>{`${formatCurrency(value)} ${currency.toUpperCase()}`}</span>
                                ))}
                            </div>
                        </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-1/3">ຜູ້ຮັບຜົນປະໂຫຍດ</TableHead>
                                <TableHead className="w-[120px] text-center">ເປີເຊັນ (%)</TableHead>
                                <TableHead className="text-right">LAK</TableHead>
                                <TableHead className="text-right">THB</TableHead>
                                <TableHead className="text-right">USD</TableHead>
                                <TableHead className="text-right">CNY</TableHead>
                                <TableHead className="w-[50px] print:hidden"><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dividendStructure.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium p-1">
                                        <Textarea 
                                            value={item.name} 
                                            onChange={(e) => handleDividendChange(item.id, 'name', e.target.value)}
                                            className="h-8 min-h-[32px]"
                                        />
                                    </TableCell>
                                    <TableCell className="text-center p-1">
                                         <Input 
                                            type="number"
                                            value={item.percentage * 100} 
                                            onChange={(e) => handleDividendChange(item.id, 'percentage', e.target.value)}
                                            className="h-8 text-center"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-mono p-1">{formatCurrency(summaryData.profit.LAK * item.percentage)}</TableCell>
                                    <TableCell className="text-right font-mono p-1">{formatCurrency(summaryData.profit.THB * item.percentage)}</TableCell>
                                    <TableCell className="text-right font-mono p-1">{formatCurrency(summaryData.profit.USD * item.percentage)}</TableCell>
                                    <TableCell className="text-right font-mono p-1">{formatCurrency(summaryData.profit.CNY * item.percentage)}</TableCell>
                                    <TableCell className="p-1 print:hidden">
                                        <Button variant="ghost" size="icon" onClick={() => removeDividendRow(item.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow className="bg-muted font-bold">
                                <TableCell>ລວມທັງໝົດ</TableCell>
                                <TableCell className="text-center">{formatCurrency(totalPercentage * 100)}%</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(summaryData.profit.LAK * totalPercentage)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(summaryData.profit.THB * totalPercentage)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(summaryData.profit.USD * totalPercentage)}</TableCell>
                                <TableCell className="text-right font-mono">{formatCurrency(summaryData.profit.CNY * totalPercentage)}</TableCell>
                                <TableCell className="print:hidden"></TableCell>
                            </TableRow>
                        </TableFooter>
                      </Table>
                      <div className="flex justify-start print:hidden">
                          <Button onClick={addDividendRow} variant="outline">
                              <PlusCircle className="mr-2 h-4 w-4" />
                              ເພີ່ມລາຍການ
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>
      </main>
    </div>
  )
}
