
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Landmark, Wallet, PlusCircle, Calendar as CalendarIcon, ChevronDown, ChevronUp, MoreHorizontal, Pencil, Trash2, Briefcase, Combine, ArrowUpCircle, ArrowDownCircle, Scale, FileText, Banknote, Minus, Equal, Coins, MinusCircle, Truck, PiggyBank, Users } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, isSameDay, startOfMonth, endOfMonth, isWithinInterval, startOfDay, eachDayOfInterval, getYear, setMonth, getMonth } from "date-fns"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { listenToAutoPartsAccountSummary, updateAutoPartsAccountSummary, listenToAutoPartsTransactions, addAutoPartsTransaction, updateAutoPartsTransaction, deleteAutoPartsTransaction } from '@/services/autoPartsAccountancyService';
import type { AccountSummary, Transaction, CashCalculatorState, TransportEntry, DebtorCreditorEntry } from '@/lib/types';
import { listenToAutoPartsCashCalculatorState, updateAutoPartsCashCalculatorState } from '@/services/autoPartsCashCalculatorService';
import { listenToAutoPartsTransportEntries } from '@/services/autoPartsTransportService';
import { listenToAutoPartsDebtorCreditorEntries } from '@/services/autoPartsDebtorCreditorService';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, value, icon, onClick, className, href }: { title: string, value: string, icon: React.ReactNode, onClick?: () => void, className?: string, href?: string }) => {
    const cardContent = (
        <Card className={`${onClick || href ? 'cursor-pointer hover:bg-muted/80' : ''} ${className || ''}`} onClick={onClick}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                   <CardTitle className="text-sm font-medium">{title}</CardTitle>
                   {onClick && <Pencil className="h-3 w-3 text-muted-foreground" />}
                </div>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );

    if (href) {
        return <Link href={href}>{cardContent}</Link>;
    }
    
    return cardContent;
};


const CashCalculatorCard = ({ onTotalChange }: { onTotalChange: (total: number) => void }) => {
    const denominations = [100000, 50000, 20000, 10000, 5000, 2000, 1000];
    const initialCounts: Record<string, number> = { baht: 0, rate: 0, usd: 0, usd_rate: 0, ...denominations.reduce((acc, d) => ({...acc, [d]: 0}), {}) };
    
    const [calculatorState, setCalculatorState] = useState<CashCalculatorState>({ id: 'latest', counts: initialCounts });
    const [isCalculatorVisible, setCalculatorVisible] = useState(true);

    useEffect(() => {
        const unsubscribe = listenToAutoPartsCashCalculatorState(setCalculatorState);
        return () => unsubscribe();
    }, []);

    const totalKip = useMemo(() => {
        const kipFromNotes = denominations.reduce((sum, d) => sum + (d * (calculatorState.counts[d] || 0)), 0);
        const kipFromBaht = (calculatorState.counts.baht || 0) * (calculatorState.counts.rate || 0);
        const kipFromUsd = (calculatorState.counts.usd || 0) * (calculatorState.counts.usd_rate || 0);
        return kipFromNotes + kipFromBaht + kipFromUsd;
    }, [calculatorState.counts, denominations]);

    useEffect(() => {
        onTotalChange(totalKip);
    }, [totalKip, onTotalChange]);

    const handleCountChange = async (key: string, value: string) => {
        const newCounts = { ...calculatorState.counts, [key]: Number(value) || 0 };
        await updateAutoPartsCashCalculatorState({ counts: newCounts }); 
    };

    const handleReset = async () => {
        await updateAutoPartsCashCalculatorState({ counts: initialCounts });
    };

    return (
        <Card>
            <CardHeader className="cursor-pointer" onClick={() => setCalculatorVisible(!isCalculatorVisible)}>
                <div className="flex justify-between items-center">
                    <CardTitle>ເຄື່ອງຄິດໄລ່ເງິນສົດ</CardTitle>
                    <Button variant="ghost" size="icon">
                        {isCalculatorVisible ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        <span className="sr-only">Toggle Calculator</span>
                    </Button>
                </div>
            </CardHeader>
            {isCalculatorVisible && (
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ທະນະບັດ (KIP)</TableHead>
                                <TableHead>ຈຳນວນ (ໃບ)</TableHead>
                                <TableHead className="text-right">ລວມ (KIP)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {denominations.map(d => (
                                <TableRow key={d}>
                                    <TableCell className="font-medium">{d.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Input type="number" value={calculatorState.counts[d] || ''} onChange={e => handleCountChange(String(d), e.target.value)} className="w-24 h-8" />
                                    </TableCell>
                                    <TableCell className="text-right">{(d * (calculatorState.counts[d] || 0)).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                             <TableRow>
                                <TableCell className="font-medium">BAHT</TableCell>
                                <TableCell><Input type="number" value={calculatorState.counts.baht || ''} onChange={e => handleCountChange('baht', e.target.value)} className="w-24 h-8" /></TableCell>
                                <TableCell rowSpan={2} className="text-right align-bottom">{(calculatorState.counts.baht * calculatorState.counts.rate).toLocaleString()}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Rate</TableCell>
                                <TableCell><Input type="number" value={calculatorState.counts.rate || ''} onChange={e => handleCountChange('rate', e.target.value)} className="w-24 h-8" /></TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">USD</TableCell>
                                <TableCell><Input type="number" value={calculatorState.counts.usd || ''} onChange={e => handleCountChange('usd', e.target.value)} className="w-24 h-8" /></TableCell>
                                <TableCell rowSpan={2} className="text-right align-bottom">{(calculatorState.counts.usd * calculatorState.counts.usd_rate).toLocaleString()}</TableCell>
                            </TableRow>
                             <TableRow>
                                <TableCell className="font-medium">Rate</TableCell>
                                <TableCell><Input type="number" value={calculatorState.counts.usd_rate || ''} onChange={e => handleCountChange('usd_rate', e.target.value)} className="w-24 h-8" /></TableCell>
                            </TableRow>
                             <TableRow className="bg-muted/50 font-bold">
                                <TableCell colSpan={2}>ລວມທັງໝົດ (KIP)</TableCell>
                                <TableCell className="text-right text-lg">{totalKip.toLocaleString()}</TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                    <Button onClick={handleReset} variant="outline" className="mt-4 w-full">ຣີເຊັດ</Button>
                </CardContent>
            )}
        </Card>
    );
};


export default function AutoPartsAccountancyPage() {
    const { toast } = useToast();
    const [summary, setSummary] = useState<AccountSummary | null>(null);
    const [date, setDate] = useState<Date | undefined>();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [transportEntries, setTransportEntries] = useState<TransportEntry[]>([]);
    const [debtorEntries, setDebtorEntries] = useState<DebtorCreditorEntry[]>([]);
    const [newTransaction, setNewTransaction] = useState<Partial<Transaction>>({ type: 'expense', description: '', amount: 0 });
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isFormVisible, setFormVisible] = useState(true);
    const [historyDisplayMonth, setHistoryDisplayMonth] = useState<Date>(new Date());


    const [editingField, setEditingField] = useState<'capital' | 'cash' | 'transfer' | 'workingCapital' | null>(null);
    const [editingValue, setEditingValue] = useState(0);

    useEffect(() => {
        const unsubscribeSummary = listenToAutoPartsAccountSummary(setSummary);
        const unsubscribeTransactions = listenToAutoPartsTransactions(setTransactions);
        const unsubscribeTransport = listenToAutoPartsTransportEntries(setTransportEntries);
        const unsubscribeDebtors = listenToAutoPartsDebtorCreditorEntries(setDebtorEntries);
        setDate(new Date());
        return () => {
            unsubscribeSummary();
            unsubscribeTransactions();
            unsubscribeTransport();
            unsubscribeDebtors();
        };
    }, []);

    const handleCalculatorTotalChange = async (totalKip: number) => {
        if (summary && totalKip !== summary.cash) {
            await updateAutoPartsAccountSummary({ cash: totalKip });
        }
    };

    const totalBalance = useMemo(() => {
        if (!summary) return 0;
        return (summary.cash || 0) + (summary.transfer || 0);
    }, [summary]);
    
    const transportRemaining = useMemo(() => {
        return transportEntries.filter(e => !e.finished).reduce((total, row) => total + (row.amount || 0), 0);
    }, [transportEntries]);

    const totalDebtors = useMemo(() => {
        return debtorEntries
            .filter(e => e.type === 'debtor' && !e.isPaid)
            .reduce((sum, entry) => sum + entry.amount, 0);
    }, [debtorEntries]);

    const grandTotalMoney = useMemo(() => {
        return totalBalance + transportRemaining + totalDebtors;
    }, [totalBalance, transportRemaining, totalDebtors]);

    const performanceData = useMemo(() => {
        const startOfSelectedMonth = startOfMonth(historyDisplayMonth);
        const endOfSelectedMonth = endOfMonth(historyDisplayMonth);
    
        const previousTransactions = transactions.filter(tx => tx.date < startOfSelectedMonth);

        const broughtForward = previousTransactions.reduce((sum, tx) => {
             const amount = tx.amount || 0;
             return tx.type === 'income' ? sum + amount : sum - amount;
        }, 0);
    
        const monthlyTransactions = transactions.filter(tx => isWithinInterval(tx.date, { start: startOfSelectedMonth, end: endOfSelectedMonth }));
        
        const income = monthlyTransactions
            .filter(tx => tx.type === 'income')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
            
        const expense = monthlyTransactions
            .filter(tx => tx.type === 'expense')
            .reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
        const netProfit = income - expense;
        const endingBalance = broughtForward + netProfit;
        
        return { broughtForward, income, expense, netProfit, endingBalance };
    }, [transactions, historyDisplayMonth]);

    const remainingMoney = useMemo(() => {
        if (!summary) return 0;
        return (summary.capital || 0) + performanceData.endingBalance;
    }, [summary, performanceData.endingBalance]);

    const differenceAmount = useMemo(() => {
        return remainingMoney - totalBalance;
    }, [totalBalance, remainingMoney]);

     const dailySummaries = useMemo(() => {
        const start = startOfMonth(historyDisplayMonth);
        const end = endOfMonth(historyDisplayMonth);
        
        const monthlyTransactions = transactions.filter(tx => isWithinInterval(tx.date, { start, end }));

        const grouped = monthlyTransactions.reduce((acc, tx) => {
            const dayKey = format(tx.date, 'yyyy-MM-dd');
            if (!acc[dayKey]) {
                acc[dayKey] = {
                    date: tx.date,
                    transactions: [],
                    income: 0,
                    expense: 0
                };
            }
            acc[dayKey].transactions.push(tx);
            if (tx.type === 'income') {
                acc[dayKey].income += tx.amount || 0;
            } else {
                acc[dayKey].expense += tx.amount || 0;
            }
            return acc;
        }, {} as Record<string, { date: Date, transactions: Transaction[], income: number, expense: number }>);

        return Object.values(grouped).sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [transactions, historyDisplayMonth]);


    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!date || !newTransaction.description || newTransaction.amount === undefined) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາໃສ່ວັນທີ, ຄຳອະທິບາຍ ແລະ ຈຳນວນເງິນ", variant: "destructive" });
            return;
        }
        try {
            await addAutoPartsTransaction({
                date: startOfDay(date),
                type: newTransaction.type || 'expense',
                description: newTransaction.description || '',
                amount: Number(newTransaction.amount || 0),
            });
            toast({ title: "ເພີ່ມທຸລະກຳສຳເລັດ" });
            setNewTransaction({ type: 'expense', description: '', amount: 0 });
            setDate(new Date());
        } catch (error) {
            console.error("Error adding transaction: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    const handleUpdateTransaction = async () => {
        if (!editingTransaction) return;
        try {
            await updateAutoPartsTransaction(editingTransaction.id, {
                ...editingTransaction,
                date: startOfDay(editingTransaction.date),
            });
            toast({ title: "ອັບເດດທຸລະກຳສຳເລັດ" });
            setEditingTransaction(null);
        } catch (error) {
            console.error("Error updating transaction: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!window.confirm("ເຈົ້າແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບລາຍການນີ້?")) return;
        try {
            await deleteAutoPartsTransaction(id);
            toast({ title: "ລຶບທຸລະກຳສຳເລັດ" });
        } catch (error) {
            console.error("Error deleting transaction: ", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };
    
    const openEditDialog = (field: 'capital' | 'cash' | 'transfer' | 'workingCapital') => {
        if (!summary) return;
        if (field === 'cash') {
            toast({title: "ແຈ້ງເຕືອນ", description: "ບໍ່ສາມາດແກ້ໄຂເງິນສົດໂດຍກົງໄດ້, ກະລຸນາໃຊ້ເຄື່ອງຄິດໄລ່ເງິນສົດ."});
            return;
        }
        setEditingField(field);
        setEditingValue(summary[field] || 0);
    };

    const handleSaveSummary = async () => {
        if (!editingField || editingValue === null) return;
        try {
            await updateAutoPartsAccountSummary({ [editingField]: editingValue });
            toast({ title: "ບັນທຶກຍອດເງິນສຳເລັດ" });
            setEditingField(null);
            setEditingValue(0);
        } catch (error) {
             console.error("Error saving summary: ", error);
             toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    };

    const MonthYearSelector = () => {
        const currentYear = getYear(new Date());
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
        years.push(2025);
        const uniqueYears = [...new Set(years)].sort();

        const months = Array.from({ length: 12 }, (_, i) => setMonth(new Date(), i));

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2">
                        {format(historyDisplayMonth, "LLLL yyyy")}
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {uniqueYears.map(year => (
                         <DropdownMenuSub key={year}>
                            <DropdownMenuSubTrigger>
                                <span>{year + 543}</span>
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    {months.map(month => (
                                        <DropdownMenuItem 
                                            key={getMonth(month)} 
                                            onClick={() => {
                                                const newDate = new Date(year, getMonth(month), 1);
                                                setHistoryDisplayMonth(newDate);
                                            }}
                                        >
                                            {format(month, "LLLL")}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                             </DropdownMenuPortal>
                        </DropdownMenuSub>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    };

    if (!summary) {
        return <div className="flex items-center justify-center h-screen">ກຳລັງໂຫລດຂໍ້ມູນ...</div>;
    }
    
    const getDialogTitle = () => {
        switch(editingField) {
            case 'capital': return 'ແກ້ໄຂເງິນທຶນ';
            case 'cash': return 'ແກ້ໄຂເງິນສົດ';
            case 'transfer': return 'ແກ້ໄຂເງິນໂอน';
            case 'workingCapital': return 'ແກ້ໄຂເງິນໝູນວຽນ';
            default: return 'ແກ້ໄຂ';
        }
    }


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/autoparts"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ຈັດການບັນຊີ (ທຸລະກິດອາໄຫຼລົດ)</h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                     <SummaryCard title="ເງິນທຶນ" value={formatCurrency(summary.capital || 0)} icon={<Briefcase className="h-5 w-5 text-primary" />} onClick={() => openEditDialog('capital')} />
                     <SummaryCard title="ເງິນສົດ" value={formatCurrency(summary.cash || 0)} icon={<Wallet className="h-5 w-5 text-primary" />} />
                     <SummaryCard title="ເງິນໂອນ" value={formatCurrency(summary.transfer || 0)} icon={<Landmark className="h-5 w-5 text-primary" />} onClick={() => openEditDialog('transfer')} />
                     <SummaryCard title="ລວມເງິນ" value={formatCurrency(totalBalance)} icon={<Combine className="h-5 w-5 text-green-600" />} />
                     <SummaryCard title="ຄົງເຫຼືອຈາກຂົນສົ່ງ" value={formatCurrency(transportRemaining)} icon={<Truck className="h-5 w-5 text-red-600" />} href="/autoparts/transport" />
                     <SummaryCard title="ລູກໜີ້/ເຈົ້າໜີ້" value={formatCurrency(totalDebtors)} icon={<Users className="h-5 w-5 text-yellow-600" />} href="/autoparts/debtors" />
                     <SummaryCard title="ລວມທັງໝົດ" value={formatCurrency(grandTotalMoney)} icon={<PiggyBank className="h-5 w-5 text-blue-600" />} />
                      <SummaryCard title="ສ່ວນຕ່າງ" value={formatCurrency(differenceAmount)} icon={<MinusCircle className="h-5 w-5 text-indigo-500" />} />
                </div>
                 <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                            <CardTitle>ສະຫຼຸບຜົນປະກອບການ</CardTitle>
                            <CardDescription>ສຳລັບເດືອນທີ່ເລືອກ</CardDescription>
                        </div>
                        <MonthYearSelector />
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <SummaryCard title="ຍອດຍົກມາ" value={formatCurrency(performanceData.broughtForward)} icon={<FileText className="h-5 w-5 text-primary" />} />
                        <SummaryCard title="ລາຍຮັບ (ເດືອນ)" value={formatCurrency(performanceData.income)} icon={<ArrowUpCircle className="h-5 w-5 text-green-500" />} />
                        <SummaryCard title="ລາຍຈ່າຍ (ເດືອນ)" value={formatCurrency(performanceData.expense)} icon={<ArrowDownCircle className="h-5 w-5 text-red-500" />} />
                        <SummaryCard title="ກຳໄລ/ຂາດທຶນ (ເດືອນ)" value={formatCurrency(performanceData.netProfit)} icon={<Scale className="h-5 w-5 text-blue-500" />} />
                        <SummaryCard title="ຍອດທ້າຍເດືອນ" value={formatCurrency(performanceData.endingBalance)} icon={<Banknote className="h-5 w-5 text-indigo-500" />} />
                        <SummaryCard title="ເງິນຍັງເຫຼືອ" value={formatCurrency(remainingMoney)} icon={<Coins className="h-5 w-5 text-yellow-600" />} />
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1 flex flex-col gap-4">
                        <Card>
                             <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setFormVisible(!isFormVisible)}>
                                <div>
                                    <CardTitle>ເພີ່ມທຸລະກຳ</CardTitle>
                                    <CardDescription>ບັນທຶກລາຍຮັບ-ລາຍຈ່າຍໃໝ່</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon">
                                    {isFormVisible ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                </Button>
                            </CardHeader>
                           {isFormVisible && (
                            <CardContent>
                                <form onSubmit={handleAddTransaction} className="grid gap-4">
                                     <div className="grid gap-2">
                                        <Label>ປະເພດ</Label>
                                        <RadioGroup value={newTransaction.type} onValueChange={(v) => setNewTransaction(p => ({ ...p, type: v as 'income' | 'expense' }))} className="flex gap-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="r-income" /><Label htmlFor="r-income">ລາຍຮັບ</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="r-expense" /><Label htmlFor="r-expense">ລາຍຈ່າຍ</Label></div>
                                        </RadioGroup>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="date">ວັນທີ</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? format(date, "PPP") : <span>ເລືອກວັນທີ</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus  /></PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="description">ຄຳອະທິບາຍ</Label>
                                        <Textarea id="description" value={newTransaction.description || ''} onChange={(e) => setNewTransaction(p => ({ ...p, description: e.target.value }))} required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="new-kip">ຈຳນວນເງິນ (KIP)</Label>
                                        <Input id="new-kip" type="number" value={newTransaction.amount || ''} onChange={(e) => setNewTransaction(p => ({ ...p, amount: Number(e.target.value) }))} placeholder="0" />
                                    </div>
                                    <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມທຸລະກຳ</Button>
                                </form>
                            </CardContent>
                           )}
                        </Card>
                        <CashCalculatorCard onTotalChange={handleCalculatorTotalChange} />
                    </div>

                     <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                             <div>
                                <CardTitle>ປະຫວັດທຸລະກຳ</CardTitle>
                                <CardDescription>ສະແດງລາຍການສຳລັບເດືອນທີ່ເລືອກ</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                             {dailySummaries.length > 0 ? (
                                <Accordion type="single" collapsible className="w-full">
                                {dailySummaries.map((summary, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-4">
                                            <div className="font-semibold">{`ວັນທີ ${format(summary.date, "d MMMM yyyy")}`}</div>
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                                <span className="text-green-600">ຮັບ: {formatCurrency(summary.income)} KIP</span>
                                                <span className="text-red-600">ຈ່າຍ: {formatCurrency(summary.expense)} KIP</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>ຄຳອະທິບາຍ</TableHead>
                                                    <TableHead className="text-right">ຈຳນວນເງິນ (KIP)</TableHead>
                                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {summary.transactions.map(tx => (
                                                    <TableRow key={tx.id} className={tx.type === 'income' ? 'bg-green-50/50' : 'bg-red-50/50'}>
                                                        <TableCell className="font-medium">{tx.description}</TableCell>
                                                        <TableCell className={`text-right font-semibold ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(tx.amount || 0)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuLabel>ການດຳເນີນການ</DropdownMenuLabel>
                                                                    <DropdownMenuItem onClick={() => setEditingTransaction(tx)}>ແກ້ໄຂ</DropdownMenuItem>
                                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTransaction(tx.id)}>ລຶບ</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                                ))}
                                </Accordion>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳໃນເດືອນນີ້</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>

            {editingTransaction && (
                 <Dialog open={!!editingTransaction} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>ແກ້ໄຂທຸລະກຳ</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                           <RadioGroup value={editingTransaction.type} onValueChange={(v) => setEditingTransaction(p => p ? { ...p, type: v as 'income' | 'expense' } : null)} className="flex gap-4">
                               <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="edit-income" /><Label htmlFor="edit-income">ລາຍຮັບ</Label></div>
                               <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="edit-expense" /><Label htmlFor="edit-expense">ລາຍຈ່າຍ</Label></div>
                           </RadioGroup>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"}><CalendarIcon className="mr-2 h-4 w-4" />{format(editingTransaction.date, "PPP")}</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={editingTransaction.date} onSelect={(d) => setEditingTransaction(p => p ? { ...p, date: d || new Date() } : null)} initialFocus  />
                                </PopoverContent>
                            </Popover>
                            <Textarea value={editingTransaction.description} onChange={(e) => setEditingTransaction(p => p ? { ...p, description: e.target.value } : null)} />
                            <div className="grid gap-2">
                                <Label htmlFor="edit-amount">ຈຳນວນເງິນ (KIP)</Label>
                                <Input id="edit-amount" type="number" value={editingTransaction.amount || ''} onChange={(e) => setEditingTransaction(p => p ? { ...p, amount: Number(e.target.value) } : null)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingTransaction(null)}>ຍົກເລີກ</Button>
                            <Button onClick={handleUpdateTransaction}>ບັນທຶກ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {editingField && (
                 <Dialog open={!!editingField} onOpenChange={(isOpen) => !isOpen && setEditingField(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{getDialogTitle()}</DialogTitle></DialogHeader>
                        <div className="grid gap-4 py-4">
                             <div className="grid gap-2">
                                <Label htmlFor="summary-amount" className="uppercase">ຈຳນວນເງິນ (KIP)</Label>
                                <Input id="summary-amount" type="number" value={editingValue || ''} onChange={(e) => setEditingValue(Number(e.target.value))} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingField(null)}>ຍົກເລີກ</Button>
                            <Button onClick={handleSaveSummary}>ບັນທຶກ</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

