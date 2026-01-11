
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { listenToCooperativeTransactions } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues } from '@/lib/types';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function IncomeStatementPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(startOfYear(new Date()));
    const [endDate, setEndDate] = useState<Date | undefined>(endOfYear(new Date()));

    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    const reportData = useMemo(() => {
        const filteredTransactions = transactions.filter(tx => {
            if (!startDate || !endDate) return true;
            return isWithinInterval(tx.date, { start: startDate, end: endDate });
        });

        const incomeByAccount: Record<string, CurrencyValues> = {};
        const expenseByAccount: Record<string, CurrencyValues> = {};
        const totalIncome: CurrencyValues = { ...initialCurrencyValues };
        const totalExpense: CurrencyValues = { ...initialCurrencyValues };

        filteredTransactions.forEach(tx => {
            const account = defaultAccounts.find(a => a.id === tx.accountId);
            if (!account) return;

            const multiplier = tx.type === 'debit' ? 1 : -1;
            
            if (account.type === 'income') {
                if (!incomeByAccount[account.id]) incomeByAccount[account.id] = { ...initialCurrencyValues };
                currencies.forEach(c => {
                    const amount = (tx.amount?.[c] || 0) * multiplier * -1; // Invert for income
                    incomeByAccount[account.id][c] += amount;
                    totalIncome[c] += amount;
                });
            } else if (account.type === 'expense') {
                if (!expenseByAccount[account.id]) expenseByAccount[account.id] = { ...initialCurrencyValues };
                currencies.forEach(c => {
                    const amount = (tx.amount?.[c] || 0) * multiplier;
                    expenseByAccount[account.id][c] += amount;
                    totalExpense[c] += amount;
                });
            }
        });
        
        const netProfit = currencies.reduce((acc, c) => {
            acc[c] = totalIncome[c] - totalExpense[c];
            return acc;
        }, { ...initialCurrencyValues });

        return { incomeByAccount, expenseByAccount, totalIncome, totalExpense, netProfit };
    }, [transactions, startDate, endDate]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/accounting/reports">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ໃບລາຍງານຜົນໄດ້ຮັບ (Income Statement)</h1>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>ໂຕກອງລາຍງານ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="start-date">ວັນທີເລີ່ມຕົ້ນ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="start-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {startDate ? format(startDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="end-date">ວັນທີສິ້ນສຸດ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="end-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {endDate ? format(endDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Income Statement</CardTitle>
                        <CardDescription>
                            From {startDate ? format(startDate, "PPP") : '...'} to {endDate ? format(endDate, "PPP") : '...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ລາຍການ</TableHead>
                                    {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow className="font-bold bg-muted/20"><TableCell colSpan={5}>ລາຍຮັບ</TableCell></TableRow>
                                {Object.entries(reportData.incomeByAccount).map(([accountId, balances]) => (
                                    <TableRow key={accountId}>
                                        <TableCell className="pl-8">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                        {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(balances[c])}</TableCell>)}
                                    </TableRow>
                                ))}
                                <TableRow className="font-semibold bg-muted/40">
                                    <TableCell>ລວມລາຍຮັບ</TableCell>
                                    {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(reportData.totalIncome[c])}</TableCell>)}
                                </TableRow>
                                <TableRow className="font-bold bg-muted/20"><TableCell colSpan={5}>ລາຍຈ່າຍ</TableCell></TableRow>
                                {Object.entries(reportData.expenseByAccount).map(([accountId, balances]) => (
                                    <TableRow key={accountId}>
                                        <TableCell className="pl-8">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                        {currencies.map(c => <TableCell key={c} className="text-right">({formatCurrency(balances[c])})</TableCell>)}
                                    </TableRow>
                                ))}
                                <TableRow className="font-semibold bg-muted/40">
                                    <TableCell>ລວມລາຍຈ່າຍ</TableCell>
                                    {currencies.map(c => <TableCell key={c} className="text-right">({formatCurrency(reportData.totalExpense[c])})</TableCell>)}
                                </TableRow>
                            </TableBody>
                            <TableFooter>
                                <TableRow className="font-bold text-lg bg-primary/10">
                                    <TableCell>ກຳໄລ / (ຂາດທຶນ) ສຸດທິ</TableCell>
                                    {currencies.map(c => <TableCell key={c} className={`text-right ${reportData.netProfit[c] < 0 ? 'text-red-600' : ''}`}>{formatCurrency(reportData.netProfit[c])}</TableCell>)}
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
