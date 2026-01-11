
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Landmark, Calendar as CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { format, startOfDay } from 'date-fns';
import { listenToCooperativeTransactions, getAccountBalances } from '@/services/cooperativeAccountingService';
import { defaultAccounts } from '@/services/cooperativeChartOfAccounts';
import type { Transaction, CurrencyValues } from '@/lib/types';

const currencies: (keyof CurrencyValues)[] = ['kip', 'thb', 'usd', 'cny'];
const initialCurrencyValues: CurrencyValues = { kip: 0, thb: 0, usd: 0, cny: 0 };

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('lo-LA', { minimumFractionDigits: 0 }).format(value);
};

export default function BalanceSheetPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [asOfDate, setAsOfDate] = useState<Date | undefined>(new Date());

    useEffect(() => {
        const unsubscribe = listenToCooperativeTransactions(setTransactions);
        return () => unsubscribe();
    }, []);

    const reportData = useMemo(() => {
        const filteredTransactions = transactions.filter(tx => {
            if (!asOfDate) return true;
            return tx.date <= startOfDay(asOfDate);
        });

        const balances = getAccountBalances(filteredTransactions);

        const assets = { ...initialCurrencyValues };
        const liabilities = { ...initialCurrencyValues };
        const equity = { ...initialCurrencyValues };
        
        const assetAccounts: Record<string, CurrencyValues> = {};
        const liabilityAccounts: Record<string, CurrencyValues> = {};
        const equityAccounts: Record<string, CurrencyValues> = {};

        defaultAccounts.forEach(account => {
            const balance = balances[account.id] || { ...initialCurrencyValues };
            if (account.type === 'asset') {
                assetAccounts[account.id] = balance;
                currencies.forEach(c => assets[c] += balance[c]);
            } else if (account.type === 'liability') {
                liabilityAccounts[account.id] = balance;
                currencies.forEach(c => liabilities[c] += balance[c] * -1); // Liabilities are credit balances
            } else if (account.type === 'equity') {
                equityAccounts[account.id] = balance;
                currencies.forEach(c => equity[c] += balance[c] * -1); // Equity are credit balances
            } else if (account.type === 'income') {
                 currencies.forEach(c => equity[c] += balance[c] * -1); // Retained Earnings
            } else if (account.type === 'expense') {
                currencies.forEach(c => equity[c] += balance[c] * -1); // Retained Earnings
            }
        });
        
        const totalLiabilitiesAndEquity = currencies.reduce((acc, c) => {
            acc[c] = liabilities[c] + equity[c];
            return acc;
        }, { ...initialCurrencyValues });

        return { assetAccounts, liabilityAccounts, equityAccounts, assets, liabilities, equity, totalLiabilitiesAndEquity };

    }, [transactions, asOfDate]);

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
                <Button variant="outline" size="icon" className="h-8 w-8" asChild>
                    <Link href="/tee/cooperative/accounting/reports">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-xl font-bold tracking-tight">ໃບສະຫຼຸບຊັບສິນ (Balance Sheet)</h1>
            </header>
            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>ໂຕກອງລາຍງານ</CardTitle>
                        <CardContent className="flex flex-col md:flex-row md:items-end gap-4 pt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="as-of-date">ຂໍ້ມູນ ณ ວັນທີ</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="as-of-date" variant={"outline"} className="w-[200px] justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {asOfDate ? format(asOfDate, "dd/MM/yyyy") : <span>ເລືອກ</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={asOfDate} onSelect={setAsOfDate} initialFocus /></PopoverContent>
                                </Popover>
                            </div>
                        </CardContent>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Balance Sheet</CardTitle>
                        <CardDescription>
                            As of {asOfDate ? format(asOfDate, "PPP") : '...'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-8">
                             <div>
                                <h3 className="text-lg font-bold mb-2">ສິນຊັບ (Assets)</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ບັນຊີ</TableHead>
                                            {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(reportData.assetAccounts).map(([accountId, balances]) => (
                                            <TableRow key={accountId}>
                                                <TableCell>{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                                {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(balances[c])}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold bg-muted">
                                            <TableCell>ລວມສິນຊັບ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(reportData.assets[c])}</TableCell>)}
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-2">ໜີ້ສິນ ແລະ ທຶນ (Liabilities and Equity)</h3>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ບັນຊີ</TableHead>
                                            {currencies.map(c => <TableHead key={c} className="text-right uppercase">{c}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow className="font-semibold bg-muted/20"><TableCell colSpan={5}>ໜີ້ສິນ</TableCell></TableRow>
                                        {Object.entries(reportData.liabilityAccounts).map(([accountId, balances]) => (
                                            <TableRow key={accountId}>
                                                <TableCell className="pl-8">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                                {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(balances[c] * -1)}</TableCell>)}
                                            </TableRow>
                                        ))}
                                         <TableRow className="font-semibold bg-muted/40">
                                            <TableCell>ລວມໜີ້ສິນ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(reportData.liabilities[c])}</TableCell>)}
                                        </TableRow>
                                         <TableRow className="font-semibold bg-muted/20"><TableCell colSpan={5}>ທຶນ</TableCell></TableRow>
                                         {Object.entries(reportData.equityAccounts).map(([accountId, balances]) => (
                                            <TableRow key={accountId}>
                                                <TableCell className="pl-8">{defaultAccounts.find(a => a.id === accountId)?.name}</TableCell>
                                                {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(balances[c] * -1)}</TableCell>)}
                                            </TableRow>
                                        ))}
                                         <TableRow className="font-semibold bg-muted/40">
                                            <TableCell>ລວມທຶນ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(reportData.equity[c])}</TableCell>)}
                                        </TableRow>
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow className="font-bold bg-muted">
                                            <TableCell>ລວມໜີ້ສິນ ແລະ ທຶນ</TableCell>
                                            {currencies.map(c => <TableCell key={c} className="text-right">{formatCurrency(reportData.totalLiabilitiesAndEquity[c])}</TableCell>)}
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

