
"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { listenToCooperativeTransactions, deleteTransactionGroup } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues } from '@/lib/types';
import { format, isSameMonth, isSameYear, getYear, setMonth, getMonth } from 'date-fns';
import { lo } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
}

const SummaryCard = ({ title, balances, titleClassName }: { title: string, balances: CurrencyValues, titleClassName?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${titleClassName}`}>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {currencies.map(c => (
                 (balances[c] || 0) !== 0 && (
                 <div key={c} className="text-lg font-bold">
                    <span className="font-semibold uppercase text-muted-foreground">{c}: </span>
                    <span className={balances[c] < 0 ? 'text-red-600' : 'text-green-600'}>{formatCurrency(balances[c] || 0)}</span>
                </div>)
            ))}
             {Object.values(balances).every(v => v === 0) && <div className="text-lg font-bold text-muted-foreground">-</div>}
        </CardContent>
    </Card>
);

const calculateSummary = (transactions: Transaction[]): { income: CurrencyValues; expense: CurrencyValues; net: CurrencyValues } => {
    const income = { ...initialCurrencyValues };
    const expense = { ...initialCurrencyValues };

    transactions.forEach(tx => {
        const account = defaultAccounts.find(a => a.id === tx.accountId);
        if (!account || (account.type !== 'income' && account.type !== 'expense')) return;

        const multiplier = tx.type === 'debit' ? 1 : -1;
        
        currencies.forEach(c => {
            const amount = (tx.amount?.[c] || 0) * multiplier;
            if (account.type === 'income') {
                income[c] -= amount;
            } else if (account.type === 'expense') {
                expense[c] += amount;
            }
        });
    });

    const net = currencies.reduce((acc, c) => {
        acc[c] = income[c] - expense[c];
        return acc;
    }, { ...initialCurrencyValues });

    return { income, expense, net };
};

export default function CooperativeIncomeExpensePage() {
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filter, setFilter] = useState<{ year: number | 'all'; month: number | 'all' }>({
        year: new Date().getFullYear(),
        month: new Date().getMonth(),
    });
    
    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);
    
    const filteredTransactions = useMemo(() => {
        return transactions.filter(tx => {
            if (!tx.date) return false;
            const txYear = getYear(tx.date);
            const txMonth = getMonth(tx.date);

            const yearMatch = filter.year === 'all' || txYear === filter.year;
            const monthMatch = filter.month === 'all' || txMonth === filter.month;

            if (filter.year !== 'all' && filter.month !== 'all') {
                return yearMatch && monthMatch;
            }
            if (filter.year !== 'all') {
                return yearMatch;
            }
            return true; // "all years"
        });
    }, [transactions, filter]);

    const summaryForSelectedPeriod = useMemo(() => calculateSummary(filteredTransactions), [filteredTransactions]);
    
    const summaryForThisMonth = useMemo(() => {
        const now = new Date();
        const thisMonthTxs = transactions.filter(tx => tx.date && isSameMonth(tx.date, now) && isSameYear(tx.date, now));
        return calculateSummary(thisMonthTxs);
    }, [transactions]);
    
    const summaryForThisYear = useMemo(() => {
        const now = new Date();
        const thisYearTxs = transactions.filter(tx => tx.date && isSameYear(tx.date, now));
        return calculateSummary(thisYearTxs);
    }, [transactions]);
    
    const handleDeleteTransaction = async (groupId: string) => {
         if (!groupId) {
            toast({
                title: "ຂໍ້ມູນຜິດພາດ",
                description: "ບໍ່ພົບ ID ຂອງກຸ່ມທຸລະກຳ",
                variant: "destructive"
            });
            return;
        }
        try {
            await deleteTransactionGroup(groupId);
            toast({
                title: "ລຶບທຸລະກຳສຳເລັດ"
            });
        } catch (error) {
            console.error('Error deleting transaction group:', error);
            toast({
                title: 'ເກີດຂໍ້ຜິດພາດ',
                description: 'ບໍ່ສາມາດລຶບທຸລະກຳໄດ້',
                variant: 'destructive',
            });
        }
    };
    
    const MonthYearSelector = () => {
        const currentYear = getYear(new Date());
        const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
        years.push(2025);
        const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

        const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: format(setMonth(new Date(), i), 'LLLL', { locale: lo }) }));
        
        return (
            <div className="flex gap-2">
                <Select value={filter.month === 'all' ? 'all' : String(filter.month)} onValueChange={v => setFilter(f => ({ ...f, month: v === 'all' ? 'all' : Number(v) }))}>
                    <SelectTrigger className="w-36">
                        <SelectValue placeholder="ເດືອນ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ທຸກໆເດືອນ</SelectItem>
                        {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Select value={filter.year === 'all' ? 'all' : String(filter.year)} onValueChange={v => setFilter(f => ({ ...f, year: v === 'all' ? 'all' : Number(v) }))}>
                    <SelectTrigger className="w-32">
                        <SelectValue placeholder="ປີ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">ທຸກໆປີ</SelectItem>
                        {uniqueYears.map(y => <SelectItem key={y} value={String(y)}>ປີ {y + 543}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        );
    };


    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                 <div className="flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <h1 className="text-xl font-bold tracking-tight">ລາຍຮັບ-ລາຍຈ່າຍ (ສະຫະກອນ)</h1>
                </div>
                 <div className="ml-auto">
                    <MonthYearSelector />
                </div>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard title="ລາຍຮັບລວມ (ເດືອນນີ້)" balances={summaryForThisMonth.income} titleClassName="text-blue-600" />
                    <SummaryCard title="ລາຍຈ່າຍລວມ (ເດືອນນີ້)" balances={summaryForThisMonth.expense} titleClassName="text-blue-600" />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນ (ເດືອນນີ້)" balances={summaryForThisMonth.net} titleClassName="text-blue-600" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard title="ລາຍຮັບລວມ (ປີນີ້)" balances={summaryForThisYear.income} titleClassName="text-purple-600" />
                    <SummaryCard title="ລາຍຈ່າຍລວມ (ປີນີ້)" balances={summaryForThisYear.expense} titleClassName="text-purple-600" />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນ (ປີນີ້)" balances={summaryForThisYear.net} titleClassName="text-purple-600" />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SummaryCard title="ລາຍຮັບລວມ (ທີ່ເລືອກ)" balances={summaryForSelectedPeriod.income} />
                    <SummaryCard title="ລາຍຈ່າຍລວມ (ທີ່ເລືອກ)" balances={summaryForSelectedPeriod.expense} />
                    <SummaryCard title="ກຳໄລ/ຂາດທຶນສຸດທິ (ທີ່ເລືອກ)" balances={summaryForSelectedPeriod.net} />
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>ລາຍການທຸລະກຳຫຼ້າສຸດ</CardTitle>
                        <CardDescription>ສະແດງທຸກລາຍການເຄື່ອນໄຫວທາງການເງິນ</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ວັນທີ</TableHead>
                                    <TableHead>ລາຍລະອຽດ</TableHead>
                                    <TableHead>ໝວດໝູ່</TableHead>
                                    <TableHead>ປະເພດ</TableHead>
                                    {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                    <TableHead><span className="sr-only">Actions</span></TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {filteredTransactions.map(tx => {
                                    const account = defaultAccounts.find(a => a.id === tx.accountId);
                                    if (!account || (account.type !== 'income' && account.type !== 'expense')) {
                                        return null;
                                    }

                                    const isIncome = account.type === 'income';
                                    const effectiveType = (isIncome && tx.type === 'credit') || (!isIncome && tx.type === 'debit') ? 'income' : 'expense';

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(tx.date, "dd/MM/yyyy")}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>{account.name}</TableCell>
                                            <TableCell>
                                                 <Badge variant={effectiveType === 'income' ? 'default' : 'destructive'} className={effectiveType === 'income' ? 'bg-green-100 text-green-800' : ''}>
                                                    {effectiveType === 'income' ? 'ລາຍຮັບ' : 'ລາຍຈ່າຍ'}
                                                </Badge>
                                            </TableCell>
                                            {currencies.map(c => {
                                                const amount = tx.amount[c] || 0;
                                                return (
                                                    <TableCell key={c} className={`text-right font-mono ${amount > 0 ? (effectiveType === 'income' ? 'text-green-600' : 'text-red-600') : ''}`}>
                                                        {amount > 0 ? formatCurrency(amount) : '-'}
                                                    </TableCell>
                                                )
                                            })}
                                            <TableCell>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>ຢືນຢັນການລົບ?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                ການກະທຳນີ້ຈະລຶບທັງລາຍການ Debit ແລະ Credit ທີ່ກ່ຽວຂ້ອງ. ບໍ່ສາມາດຍົກເລີກໄດ້.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>ຍົກເລີກ</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteTransaction(tx.transactionGroupId)}>ຢືນຢັນ</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    )
                                }).filter(Boolean)}
                            </TableBody>
                        </Table>
                         {filteredTransactions.length === 0 && <div className="text-center py-8 text-muted-foreground">ບໍ່ມີທຸລະກຳໃນເດືອນທີ່ເລືອກ</div>}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
