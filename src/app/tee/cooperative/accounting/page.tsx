
"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, PlusCircle, Calendar as CalendarIcon, Scale, Search, Trash2 } from "lucide-react"
import Link from 'next/link'
import { useToast } from "@/hooks/use-toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import { format, startOfDay } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import { listenToCooperativeTransactions, getAccountBalances, createTransaction, deleteTransactionGroup } from '@/services/cooperativeAccountingService';
import type { Account, Transaction, Currency, CurrencyValues } from '@/lib/types';
import { DateRange } from "react-day-picker";
import { v4 as uuidv4 } from 'uuid';

const currencies: (keyof Currency)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: Currency = { kip: 0, thb: 0, usd: 0, cny: 0 };


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, balances }: { title: string, balances: CurrencyValues }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {currencies.map(c => (
                (balances[c] || 0) !== 0 && (
                <div key={c} className="text-xs">
                    <span className="font-semibold uppercase">{c}: </span>
                    <span>{formatCurrency(balances[c] || 0)}</span>
                </div>
                )
            ))}
        </CardContent>
    </Card>
);

type JournalEntry = {
    transactionGroupId: string;
    date: Date;
    description: string;
    debit: { accountId: string; amount: Currency };
    credit: { accountId: string; amount: Currency };
};

export default function CooperativeAccountingPage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>(defaultAccounts);
    const [accountBalances, setAccountBalances] = useState<Record<string, CurrencyValues>>({});
    
    // Form state
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [description, setDescription] = useState('');
    const [debitAccountId, setDebitAccountId] = useState<string | undefined>(undefined);
    const [creditAccountId, setCreditAccountId] = useState<string | undefined>(undefined);
    const [amount, setAmount] = useState<Currency>({ kip: 0, thb: 0, usd: 0, cny: 0 });

    // Filter state
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [filterAccountId, setFilterAccountId] = useState<string>('all');
    const [filterDescription, setFilterDescription] = useState('');


    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const balances = getAccountBalances(transactions);
        setAccountBalances(balances);
    }, [transactions]);

    const handleAmountChange = (currency: keyof Currency, value: string) => {
        setAmount(prev => ({ ...prev, [currency]: Number(value) || 0 }));
    }

    const journalEntries = useMemo(() => {
        const grouped = transactions.reduce((acc, tx) => {
            if (!acc[tx.transactionGroupId]) {
                acc[tx.transactionGroupId] = {
                    transactionGroupId: tx.transactionGroupId,
                    date: tx.date,
                    description: tx.description,
                    debit: { accountId: '', amount: { ...initialCurrencyValues } },
                    credit: { accountId: '', amount: { ...initialCurrencyValues } }
                };
            }
            if (tx.type === 'debit') {
                acc[tx.transactionGroupId].debit = { accountId: tx.accountId, amount: tx.amount };
            } else {
                acc[tx.transactionGroupId].credit = { accountId: tx.accountId, amount: tx.amount };
            }
            return acc;
        }, {} as Record<string, JournalEntry>);
        
        let filteredEntries = Object.values(grouped);

        if(dateRange?.from && dateRange?.to) {
            filteredEntries = filteredEntries.filter(entry => 
                entry.date >= dateRange.from! && entry.date <= dateRange.to!
            );
        }

        if(filterAccountId && filterAccountId !== 'all') {
            filteredEntries = filteredEntries.filter(entry => 
                entry.debit.accountId === filterAccountId || entry.credit.accountId === filterAccountId
            );
        }

        if(filterDescription) {
            filteredEntries = filteredEntries.filter(entry =>
                entry.description.toLowerCase().includes(filterDescription.toLowerCase())
            );
        }

        return filteredEntries.sort((a,b) => b.date.getTime() - a.date.getTime());
    }, [transactions, dateRange, filterAccountId, filterDescription]);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const totalAmount = (amount.kip || 0) + (amount.thb || 0) + (amount.usd || 0) + (amount.cny || 0);

        if (!date || !description || !debitAccountId || !creditAccountId) {
            toast({ title: "ຂໍ້ມູນບໍ່ຄົບ", description: "ກະລຸນາປ້ອນຂໍ້ມູນໃຫ້ຄົບຖ້ວນ", variant: "destructive" });
            return;
        }
         if (totalAmount === 0) {
            toast({ title: "ຈຳນວນເງິນຜິດພາດ", description: "ຈຳນວນເງິນຕ້ອງບໍ່ແມ່ນສູນ", variant: "destructive" });
            return;
        }
        if (debitAccountId === creditAccountId) {
            toast({ title: "ບັນຊີຜິດພາດ", description: "Debit ແລະ Credit ຕ້ອງເປັນຄົນລະບັນຊີ", variant: "destructive" });
            return;
        }

        try {
            await createTransaction(debitAccountId, creditAccountId, amount, description, date);
            toast({ title: "ສ້າງທຸລະກຳສຳເລັດ" });
            // Reset form
            setDate(new Date());
            setDescription('');
            setDebitAccountId(undefined);
            setCreditAccountId(undefined);
            setAmount({ kip: 0, thb: 0, usd: 0, cny: 0 });

        } catch (error) {
            console.error("Error adding transaction:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດ", variant: "destructive" });
        }
    }
    
    const handleDeleteTransactionGroup = async (groupId: string) => {
        try {
            await deleteTransactionGroup(groupId);
            toast({ title: "ລຶບທຸລະກຳສຳເລັດ" });
        } catch (error) {
            console.error("Error deleting transaction group:", error);
            toast({ title: "ເກີດຂໍ້ຜິດພາດໃນການລຶບ", variant: "destructive" });
        }
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ການບັນຊີ (ສະຫະກອນ)</h1>
            </header>
            <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     {accounts.filter(a => a.type === 'asset').map(acc => (
                         <SummaryCard key={acc.id} title={acc.name} balances={accountBalances[acc.id] || { kip: 0, thb: 0, usd: 0, cny: 0 }} />
                     ))}
                </div>
                 <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>ບັນທຶກລາຍການ (Journal Entry)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAddTransaction} className="grid gap-4">
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
                                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Debit (ເດບິດ)</Label>
                                        <Select value={debitAccountId} onValueChange={setDebitAccountId}>
                                            <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                     <div className="grid gap-2">
                                        <Label>Credit (ເຄຣດິດ)</Label>
                                        <Select value={creditAccountId} onValueChange={setCreditAccountId}>
                                            <SelectTrigger><SelectValue placeholder="ເລືອກບັນຊີ" /></SelectTrigger>
                                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name} ({acc.code})</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div><Label className="text-xs">KIP</Label><Input type="number" value={amount.kip || ''} onChange={e => handleAmountChange('kip', e.target.value)} /></div>
                                    <div><Label className="text-xs">THB</Label><Input type="number" value={amount.thb || ''} onChange={e => handleAmountChange('thb', e.target.value)} /></div>
                                    <div><Label className="text-xs">USD</Label><Input type="number" value={amount.usd || ''} onChange={e => handleAmountChange('usd', e.target.value)} /></div>
                                    <div><Label className="text-xs">CNY</Label><Input type="number" value={amount.cny || ''} onChange={e => handleAmountChange('cny', e.target.value)} /></div>
                                </div>

                                <Button type="submit" className="w-full"><PlusCircle className="mr-2 h-4 w-4" />ເພີ່ມທຸລະກຳ</Button>
                            </form>
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>ປະຫວັດທຸລະກຳ</CardTitle>
                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className="w-auto justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : format(dateRange.from, "LLL dd, y")) : <span>ເລືອກຊ່ວງວັນທີ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                                    </PopoverContent>
                                </Popover>
                                <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="ກອງຕາມບັນຊີ" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">ທຸກບັນຊີ</SelectItem>
                                        {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="ຄົ້ນຫາຄຳອະທິບາຍ..." className="pl-8 w-auto" value={filterDescription} onChange={(e) => setFilterDescription(e.target.value)} />
                                </div>
                                <Button variant="ghost" onClick={() => { setDateRange(undefined); setFilterAccountId('all'); setFilterDescription(''); }}>ລ້າງໂຕກອງ</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ວັນທີ</TableHead>
                                        <TableHead>ລາຍລະອຽດ</TableHead>
                                        <TableHead>ບັນຊີ</TableHead>
                                        <TableHead className="text-right">ເດບິດ</TableHead>
                                        <TableHead className="text-right">ເຄຣດິດ</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {journalEntries.map(entry => {
                                        const debitAccount = accounts.find(a => a.id === entry.debit.accountId);
                                        const creditAccount = accounts.find(a => a.id === entry.credit.accountId);
                                        return (
                                        <React.Fragment key={entry.transactionGroupId}>
                                            <TableRow>
                                                <TableCell rowSpan={2}>{format(entry.date, "dd/MM/yyyy")}</TableCell>
                                                <TableCell rowSpan={2}>{entry.description}</TableCell>
                                                <TableCell>{debitAccount?.name}</TableCell>
                                                <TableCell className="text-right text-green-600 font-mono">
                                                     {currencies.map(c => entry.debit.amount[c] > 0 ? <div key={c}>{formatCurrency(entry.debit.amount[c])}</div>: null)}
                                                </TableCell>
                                                <TableCell></TableCell>
                                                <TableCell rowSpan={2} className="text-center align-middle">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>ยืนยันการลบ?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    การกระทำนี้จะลบทั้งรายการเดบิตและเครดิตที่เกี่ยวข้องกัน ไม่สามารถยกเลิกได้
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTransactionGroup(entry.transactionGroupId)}>ยืนยัน</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                            <TableRow>
                                                <TableCell className="pl-8">{creditAccount?.name}</TableCell>
                                                <TableCell></TableCell>
                                                <TableCell className="text-right text-red-600 font-mono">
                                                     {currencies.map(c => entry.credit.amount[c] > 0 ? <div key={c}>{formatCurrency(entry.credit.amount[c])}</div>: null)}
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    )})}
                                </TableBody>
                            </Table>
                            {journalEntries.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳ</div>}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
